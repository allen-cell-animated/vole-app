const path = require('path');
const postcss_url = require('postcss-url');

module.exports = {
    plugins: [
        require('postcss-discard-comments'),
        require('postcss-nested'),
        require('postcss-import'),
        require('postcss-simple-vars'),
        require('postcss-mixins'),
        require('postcss-extend-rule'),
        require('postcss-url')({url:"copy", basePath:path.resolve(__dirname, "packages/app/src"), assetsPath:"../../../fonts"})
    ]
};