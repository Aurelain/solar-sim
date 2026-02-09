import msg from './msg.js';

/**
 *
 */
const assume = (condition, ...message) => {
    if (!condition) {
        message = msg.apply(null, message);
        // console.log(message);
        const err = new Error(message);
        Error.captureStackTrace(err, assume);
        throw err;
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
export default assume;
