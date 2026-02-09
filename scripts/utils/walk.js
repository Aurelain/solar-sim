import fs from 'fs';

/**
 * Finds files filtered by a pattern (optional) recursively (optional).
 * Based on https://stackoverflow.com/a/16684530
 * @param dir       String, path to scan.
 * @param pattern   RegExp or Function. A filter applied to the file name (not path).
 *                  If this is a function, it will be called with (fileName, fullPath, currentDepth) as parameters.
 *                  Default: null
 * @param depth     Number. How many levels to keep searching, with 0 meaning just the current level.
 *                  Default: MAX_VALUE
 * @returns Array of paths, where each path starts with the input dir.
 */
const walk = (dir, pattern, depth) => {
    const unixDir = dir.replaceAll('\\', '/');

    depth = depth !== undefined ? Number(depth) : Number.MAX_VALUE;
    pattern = pattern instanceof RegExp || typeof pattern === 'function' ? pattern : null;

    return recurse(unixDir, pattern, depth, 0, []);
};

/**
 *
 */
const recurse = (dir, pattern, depth, currentDepth, results) => {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = dir + '/' + file;
        if (currentDepth < depth && fs.statSync(fullPath).isDirectory()) {
            recurse(fullPath, pattern, depth, currentDepth + 1, results);
        } else {
            let isValid;
            if (pattern) {
                if (typeof pattern === 'function') {
                    isValid = pattern(file, fullPath, currentDepth);
                } else {
                    isValid = file.match(pattern);
                }
            } else {
                isValid = true;
            }
            if (isValid) {
                results.push(fullPath);
            }
        }
    }
    return results;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
export default walk;
