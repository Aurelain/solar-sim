import url from 'url';

export default url.fileURLToPath(new URL('.', import.meta.url)).replace(/[\/\\]scripts.*/, '');
