const { Logger } = require('@nestjs/common');
const { HttpService } = require('@nestjs/axios');
const { ConfigService } = require('@nestjs/config');

const logger = new Logger(
  'fetch'
);

module.exports = async (url, opts) => {
    let retry = opts && opts.retry || 3

    while (retry > 0) {
        let id;
        if(opts && opts.timeout) {
            const controller = new AbortController();
            id = setTimeout(() => controller.abort(), opts.timeout);
            opts.signal = controller.signal
        }
        try {
            let res = await import('node-fetch').then(({ default: fetch }) => fetch(url, opts))
            if(opts && opts.timeout) clearTimeout(id)
            return res
        } catch(e) {
            if(opts && opts.timeout) clearTimeout(id)
            if (opts && opts.callback) {
                opts.callback(retry)
            }
            retry = retry - 1
            if (retry === 0) {
                throw e
            }

            if (opts && opts.pause) {
                if (opts && !opts.silent) logger.log("pausing..");
                await sleep(opts.pause);
                if (opts && !opts.silent) logger.log("done pausing...");
            }
        }
    }
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}