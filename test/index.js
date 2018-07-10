const Code = require('code');
const Lab = require('lab');

const Logzio = require('../lib');

exports.lab = Lab.script();
const lab = exports.lab;
const expect = Code.expect;
const describe = lab.describe;
const it = lab.it;

describe('Logzio', () => {
  describe('transforms', () => {
    it('it set tags into an array if needed', done => {
      const instance = new Logzio();
      const tags = [
        'wow',
        'ooh'
      ];
      instance._transform({
        tags,
        name: 'test',
        event: 'event'
      }, null, (err, transformed) => {
        if (err) {
          throw new Error(err);
        }
        const data = JSON.parse(transformed);
        expect(data.tags).to.equal([
          'event',
          'wow',
          'ooh'
        ]);
        done();
      });
    });

    it('can use non-utc time if needed', done => {
      const instance = new Logzio({utc: false});
      const tags = [];
      const now = new Date();
      const timeNow = now.getTime();
      instance._transform({
        tags,
        timestamp: timeNow,
        name: 'test',
        event: 'event'
      }, null, (err, transformed) => {
        if (err) {
          throw new Error(err);
        }
        const data = JSON.parse(transformed);
        expect(data.time).not.to.equal('Invalid date');
        done();
      });
    });
  });
});
