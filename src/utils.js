
const extractWordFromUri = uri => {
    if (uri.includes('#')) {
        return uri.split('#')[1];
    }
    let parts = uri.split('/');
    return parts[parts.length - 1];
};

export { extractWordFromUri }
