import { EventEmitter } from 'events';
import Connection, { InternalConnectionOptions } from './connection';

import { DataType, Parameter } from './data-type';

/**
 * @private
 */
interface InternalOptions {
  checkConstraints: boolean;
  fireTriggers: boolean;
  keepNulls: boolean;
  lockTable: boolean;
  order: { [columnName: string]: 'ASC' | 'DESC' };
}

export interface Options {
  /**
   * Honors constraints during bulk load, using T-SQL
   * [CHECK_CONSTRAINTS](https://technet.microsoft.com/en-us/library/ms186247(v=sql.105).aspx).
   * (default: `false`)
   */
  checkConstraints?: InternalOptions['checkConstraints'] | undefined;

  /**
   * Honors insert triggers during bulk load, using the T-SQL [FIRE_TRIGGERS](https://technet.microsoft.com/en-us/library/ms187640(v=sql.105).aspx). (default: `false`)
   */
  fireTriggers?: InternalOptions['fireTriggers'] | undefined;

  /**
   * Honors null value passed, ignores the default values set on table, using T-SQL [KEEP_NULLS](https://msdn.microsoft.com/en-us/library/ms187887(v=sql.120).aspx). (default: `false`)
   */
  keepNulls?: InternalOptions['keepNulls'] | undefined;

  /**
   * Places a bulk update(BU) lock on table while performing bulk load, using T-SQL [TABLOCK](https://technet.microsoft.com/en-us/library/ms180876(v=sql.105).aspx). (default: `false`)
   */
  lockTable?: InternalOptions['lockTable'] | undefined;

  /**
   * Specifies the ordering of the data to possibly increase bulk insert performance, using T-SQL [ORDER](https://docs.microsoft.com/en-us/previous-versions/sql/sql-server-2008-r2/ms177468(v=sql.105)). (default: `{}`)
   */
  order?: InternalOptions['order'] | undefined;
}


export type Callback =
  /**
   * A function which will be called after the [[BulkLoad]] finishes executing.
   *
   * @param rowCount the number of rows inserted
   */
  (err: Error | undefined | null, rowCount?: number) => void;

interface Column extends Parameter {
  objName: string;
}

interface ColumnOptions {
  output?: boolean;

  /**
   * For VarChar, NVarChar, VarBinary. Use length as `Infinity` for VarChar(max), NVarChar(max) and VarBinary(max).
   */
  length?: number;

  /**
   * For Numeric, Decimal.
   */
  precision?: number;

  /**
   * For Numeric, Decimal, Time, DateTime2, DateTimeOffset.
   */
  scale?: number;

  /**
   * If the name of the column is different from the name of the property found on `rowObj` arguments passed to [[addRow]], then you can use this option to specify the property name.
   */
  objName?: string;

  /**
   * Indicates whether the column accepts NULL values.
   */
  nullable?: boolean;
}

/**
 * A BulkLoad instance is used to perform a bulk insert.
 *
 * Use [[Connection.newBulkLoad]] to create a new instance, and [[Connection.execBulkLoad]] to execute it.
 *
 * Example of BulkLoad Usages:
 *
 * ```js
 * // optional BulkLoad options
 * const options = { keepNulls: true };
 *
 * // instantiate - provide the table where you'll be inserting to, options and a callback
 * const bulkLoad = connection.newBulkLoad('MyTable', options, (error, rowCount) => {
 *   console.log('inserted %d rows', rowCount);
 * });
 *
 * // setup your columns - always indicate whether the column is nullable
 * bulkLoad.addColumn('myInt', TYPES.Int, { nullable: false });
 * bulkLoad.addColumn('myString', TYPES.NVarChar, { length: 50, nullable: true });
 *
 * // execute
 * connection.execBulkLoad(bulkLoad, [
 *   { myInt: 7, myString: 'hello' },
 *   { myInt: 23, myString: 'world' }
 * ]);
 * ```
 */
class BulkLoad extends EventEmitter {
  /**
   * @private
   */
  error: Error | undefined;
  /**
   * @private
   */
  canceled: boolean;
  /**
   * @private
   */
  executionStarted: boolean;
  /**
   * @private
   */
  table: string;
  /**
   * @private
   */
  timeout: number | undefined;

  /**
   * @private
   */
  options: InternalConnectionOptions;
  /**
   * @private
   */
  callback: Callback;

  /**
   * @private
   */
  columns: Array<Column>;
  /**
   * @private
   */
  columnsByName: { [name: string]: Column };

  /**
   * @private
   */
  bulkOptions: InternalOptions;

  /**
   * @private
   */
  connection: Connection | undefined;
  /**
   * @private
   */
  rows: Array<any> | undefined;
  /**
   * @private
   */
  rst: Array<any> | undefined;
  /**
   * @private
   */
  rowCount: number | undefined;

  /**
   * @private
   */
  constructor(table: string, connectionOptions: InternalConnectionOptions, {
    checkConstraints = false,
    fireTriggers = false,
    keepNulls = false,
    lockTable = false,
    order = {},
  }: Options, callback: Callback) {
    if (typeof checkConstraints !== 'boolean') {
      throw new TypeError('The "options.checkConstraints" property must be of type boolean.');
    }

    if (typeof fireTriggers !== 'boolean') {
      throw new TypeError('The "options.fireTriggers" property must be of type boolean.');
    }

    if (typeof keepNulls !== 'boolean') {
      throw new TypeError('The "options.keepNulls" property must be of type boolean.');
    }

    if (typeof lockTable !== 'boolean') {
      throw new TypeError('The "options.lockTable" property must be of type boolean.');
    }

    if (typeof order !== 'object' || order === null) {
      throw new TypeError('The "options.order" property must be of type object.');
    }

    for (const [column, direction] of Object.entries(order)) {
      if (direction !== 'ASC' && direction !== 'DESC') {
        throw new TypeError('The value of the "' + column + '" key in the "options.order" object must be either "ASC" or "DESC".');
      }
    }

    super();

    this.error = undefined;
    this.canceled = false;
    this.executionStarted = false;

    this.table = table;
    this.options = connectionOptions;
    this.callback = callback;
    this.columns = [];
    this.columnsByName = {};

    this.bulkOptions = { checkConstraints, fireTriggers, keepNulls, lockTable, order };
  }

  /**
   * Adds a column to the bulk load.
   *
   * The column definitions should match the table you are trying to insert into.
   * Attempting to call addColumn after the first row has been added will throw an exception.
   *
   * ```js
   * bulkLoad.addColumn('MyIntColumn', TYPES.Int, { nullable: false });
   * ```
   *
   * @param name The name of the column.
   * @param type One of the supported `data types`.
   * @param __namedParameters Additional column type information. At a minimum, `nullable` must be set to true or false.
   * @param length For VarChar, NVarChar, VarBinary. Use length as `Infinity` for VarChar(max), NVarChar(max) and VarBinary(max).
   * @param nullable Indicates whether the column accepts NULL values.
   * @param objName If the name of the column is different from the name of the property found on `rowObj` arguments passed to [[addRow]] or [[Connection.execBulkLoad]], then you can use this option to specify the property name.
   * @param precision For Numeric, Decimal.
   * @param scale For Numeric, Decimal, Time, DateTime2, DateTimeOffset.
  */
  addColumn(name: string, type: DataType, { output = false, length, precision, scale, objName = name, nullable = true }: ColumnOptions) {
    if (this.executionStarted) {
      throw new Error('Columns cannot be added to bulk insert after execution has started.');
    }

    const column: Column = {
      type: type,
      name: name,
      value: null,
      output: output,
      length: length,
      precision: precision,
      scale: scale,
      objName: objName,
      nullable: nullable
    };

    if ((type.id & 0x30) === 0x20) {
      if (column.length == null && type.resolveLength) {
        column.length = type.resolveLength(column);
      }
    }

    if (type.resolvePrecision && column.precision == null) {
      column.precision = type.resolvePrecision(column);
    }

    if (type.resolveScale && column.scale == null) {
      column.scale = type.resolveScale(column);
    }

    this.columns.push(column);

    this.columnsByName[name] = column;
  }

  /**
   * @private
   */
  getOptionsSql() {
    const addOptions = [];

    if (this.bulkOptions.checkConstraints) {
      addOptions.push('CHECK_CONSTRAINTS');
    }

    if (this.bulkOptions.fireTriggers) {
      addOptions.push('FIRE_TRIGGERS');
    }

    if (this.bulkOptions.keepNulls) {
      addOptions.push('KEEP_NULLS');
    }

    if (this.bulkOptions.lockTable) {
      addOptions.push('TABLOCK');
    }

    if (this.bulkOptions.order) {
      const orderColumns = [];

      for (const [column, direction] of Object.entries(this.bulkOptions.order)) {
        orderColumns.push(`${column} ${direction}`);
      }

      if (orderColumns.length) {
        addOptions.push(`ORDER (${orderColumns.join(', ')})`);
      }
    }

    if (addOptions.length > 0) {
      return ` WITH (${addOptions.join(',')})`;
    } else {
      return '';
    }
  }

  /**
   * @private
   */
  getBulkInsertSql() {
    let sql = 'insert bulk ' + this.table + '(';
    for (let i = 0, len = this.columns.length; i < len; i++) {
      const c = this.columns[i];
      if (i !== 0) {
        sql += ', ';
      }
      sql += '[' + c.name + '] ' + (c.type.declaration(c));
    }
    sql += ')';

    sql += this.getOptionsSql();
    return sql;
  }

  /**
   * This is simply a helper utility function which returns a `CREATE TABLE SQL` statement based on the columns added to the bulkLoad object.
   * This may be particularly handy when you want to insert into a temporary table (a table which starts with `#`).
   *
   * ```js
   * var sql = bulkLoad.getTableCreationSql();
   * ```
   *
   * A side note on bulk inserting into temporary tables: if you want to access a local temporary table after executing the bulk load,
   * you'll need to use the same connection and execute your requests using [[Connection.execSqlBatch]] instead of [[Connection.execSql]]
   */
  getTableCreationSql() {
    let sql = 'CREATE TABLE ' + this.table + '(\n';
    for (let i = 0, len = this.columns.length; i < len; i++) {
      const c = this.columns[i];
      if (i !== 0) {
        sql += ',\n';
      }
      sql += '[' + c.name + '] ' + (c.type.declaration(c));
      if (c.nullable !== undefined) {
        sql += ' ' + (c.nullable ? 'NULL' : 'NOT NULL');
      }
    }
    sql += '\n)';
    return sql;
  }

  /**
   * Sets a timeout for this bulk load.
   *
   * ```js
   * bulkLoad.setTimeout(timeout);
   * ```
   *
   * @param timeout The number of milliseconds before the bulk load is considered failed, or 0 for no timeout.
   *   When no timeout is set for the bulk load, the [[ConnectionOptions.requestTimeout]] of the Connection is used.
   */
  setTimeout(timeout?: number) {
    this.timeout = timeout;
  }

  /**
   * @private
   */
  cancel() {
    if (this.canceled) {
      return;
    }

    this.canceled = true;
    this.emit('cancel');
  }
}

export default BulkLoad;
module.exports = BulkLoad;
