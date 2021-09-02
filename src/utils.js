
const extractWordFromUri = uri => {
    if (uri.includes('#')) {
        return uri.split('#')[1];
    }
    let parts = uri.split('/');
    return parts[parts.length - 1];
};

const buildShortFormIfPrefixExists = (prefixes, fullUri) => {
    let ret = fullUri;
    Object.entries(prefixes).forEach(([short, uri]) => {
        if (fullUri.startsWith(uri)) {
            ret = short + ":" + fullUri.substr(uri.length);
        }
    });
    return ret;
};

export { extractWordFromUri, buildShortFormIfPrefixExists }
