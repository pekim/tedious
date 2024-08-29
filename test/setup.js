require('@babel/register')({
  extensions: ['.js', '.ts'],
  plugins: [ 'istanbul' ]
});

var wtf = require('wtfnode');

exports.mochaHooks = {
  afterAll(done) {
    setTimeout(() => {
      wtf.dump();
    }, 1000);

    done();
  }
};
