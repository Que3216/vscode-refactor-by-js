export function isDeepEqual(obj1: any, obj2: any) {
    if (obj1 === obj2) {
        return true;
    }

    if (isPrimitive(obj1) && isPrimitive(obj2)) {
        return obj1 === obj2;
    }

    if (Object.keys(obj1).length !== Object.keys(obj2).length) {
        return false;
    }

    // compare objects with same number of keys
    for (let key in obj1) {
        if (!(key in obj2)) {
            return false;
        }
        if (!isDeepEqual(obj1[key], obj2[key])) {
            return false;
        }
    }

    return true;
}

function isPrimitive(obj: any) {
    return (obj !== Object(obj));
}
