"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unflattenChanges = exports.flattenChangeset = exports.Operation = exports.revertChangeset = exports.applyChangeset = exports.diff = exports.getTypeOfObj = void 0;
const lodash_1 = require("lodash");
const getTypeOfObj = (obj) => {
    if (typeof obj === 'undefined') {
        return 'undefined';
    }
    if (obj === null) {
        return null;
    }
    return Object.prototype.toString.call(obj).match(/^\[object\s(.*)\]$/)[1];
};
exports.getTypeOfObj = getTypeOfObj;
const getKey = (path) => {
    const left = path[path.length - 1];
    return left != null ? left : '$root';
};
const compare = (oldObj, newObj, path, embeddedObjKeys, keyPath) => {
    let changes = [];
    const typeOfOldObj = (0, exports.getTypeOfObj)(oldObj);
    const typeOfNewObj = (0, exports.getTypeOfObj)(newObj);
    // if type of object changes, consider it as old obj has been deleted and a new object has been added
    if (typeOfOldObj !== typeOfNewObj) {
        changes.push({ type: Operation.REMOVE, key: getKey(path), value: oldObj });
        changes.push({ type: Operation.ADD, key: getKey(path), value: newObj });
        return changes;
    }
    switch (typeOfOldObj) {
        case 'Date':
            changes = changes.concat(comparePrimitives(oldObj.getTime(), newObj.getTime(), path).map((x) => (Object.assign(Object.assign({}, x), { value: new Date(x.value), oldValue: new Date(x.oldValue) }))));
            break;
        case 'Object':
            const diffs = compareObject(oldObj, newObj, path, embeddedObjKeys, keyPath);
            if (diffs.length) {
                if (path.length) {
                    changes.push({
                        type: Operation.UPDATE,
                        key: getKey(path),
                        changes: diffs
                    });
                }
                else {
                    changes = changes.concat(diffs);
                }
            }
            break;
        case 'Array':
            changes = changes.concat(compareArray(oldObj, newObj, path, embeddedObjKeys, keyPath));
            break;
        case 'Function':
            break;
        // do nothing
        default:
            changes = changes.concat(comparePrimitives(oldObj, newObj, path));
    }
    return changes;
};
const compareObject = (oldObj, newObj, path, embeddedObjKeys, keyPath, skipPath = false) => {
    let k;
    let newKeyPath;
    let newPath;
    if (skipPath == null) {
        skipPath = false;
    }
    let changes = [];
    const oldObjKeys = Object.keys(oldObj);
    const newObjKeys = Object.keys(newObj);
    const intersectionKeys = (0, lodash_1.intersection)(oldObjKeys, newObjKeys);
    for (k of intersectionKeys) {
        newPath = path.concat([k]);
        newKeyPath = skipPath ? keyPath : keyPath.concat([k]);
        const diffs = compare(oldObj[k], newObj[k], newPath, embeddedObjKeys, newKeyPath);
        if (diffs.length) {
            changes = changes.concat(diffs);
        }
    }
    const addedKeys = (0, lodash_1.difference)(newObjKeys, oldObjKeys);
    for (k of addedKeys) {
        newPath = path.concat([k]);
        newKeyPath = skipPath ? keyPath : keyPath.concat([k]);
        changes.push({
            type: Operation.ADD,
            key: getKey(newPath),
            value: newObj[k]
        });
    }
    const deletedKeys = (0, lodash_1.difference)(oldObjKeys, newObjKeys);
    for (k of deletedKeys) {
        newPath = path.concat([k]);
        newKeyPath = skipPath ? keyPath : keyPath.concat([k]);
        changes.push({
            type: Operation.REMOVE,
            key: getKey(newPath),
            value: oldObj[k]
        });
    }
    return changes;
};
const compareArray = (oldObj, newObj, path, embeddedObjKeys, keyPath) => {
    const left = getObjectKey(embeddedObjKeys, keyPath);
    const uniqKey = left != null ? left : '$index';
    const indexedOldObj = convertArrayToObj(oldObj, uniqKey);
    const indexedNewObj = convertArrayToObj(newObj, uniqKey);
    const diffs = compareObject(indexedOldObj, indexedNewObj, path, embeddedObjKeys, keyPath, true);
    if (diffs.length) {
        return [
            {
                type: Operation.UPDATE,
                key: getKey(path),
                embeddedKey: typeof uniqKey === 'function' && uniqKey.length === 2 ? uniqKey(newObj[0], true) : uniqKey,
                changes: diffs
            }
        ];
    }
    else {
        return [];
    }
};
const getObjectKey = (embeddedObjKeys, keyPath) => {
    if (embeddedObjKeys != null) {
        const path = keyPath.join('.');
        const key = embeddedObjKeys[path];
        if (key != null) {
            return key;
        }
        for (const regex in embeddedObjKeys) {
            if (path.match(new RegExp(regex))) {
                return embeddedObjKeys[regex];
            }
        }
    }
    return undefined;
};
const convertArrayToObj = (arr, uniqKey) => {
    let obj = {};
    if (uniqKey !== '$index') {
        obj = (0, lodash_1.keyBy)(arr, uniqKey);
    }
    else {
        for (let i = 0; i < arr.length; i++) {
            const value = arr[i];
            obj[i] = value;
        }
    }
    return obj;
};
const comparePrimitives = (oldObj, newObj, path) => {
    const changes = [];
    if (oldObj !== newObj) {
        changes.push({
            type: Operation.UPDATE,
            key: getKey(path),
            value: newObj,
            oldValue: oldObj
        });
    }
    return changes;
};
// const isEmbeddedKey = key => /\$.*=/gi.test(key)
const removeKey = (obj, key, embeddedKey) => {
    if (Array.isArray(obj)) {
        if (embeddedKey === '$index') {
            obj.splice(key);
            return;
        }
        const index = indexOfItemInArray(obj, embeddedKey, key);
        if (index === -1) {
            // tslint:disable-next-line:no-console
            console.warn(`Element with the key '${embeddedKey}' and value '${key}' could not be found in the array'`);
            return;
        }
        return obj.splice(index != null ? index : key, 1);
    }
    else {
        obj[key] = undefined;
        delete obj[key];
        return;
    }
};
const indexOfItemInArray = (arr, key, value) => {
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (item && item[key] ? item[key].toString() === value.toString() : undefined) {
            return i;
        }
    }
    return -1;
};
const modifyKeyValue = (obj, key, value) => (obj[key] = value);
const addKeyValue = (obj, key, value) => {
    if (Array.isArray(obj)) {
        return obj.push(value);
    }
    else {
        return obj ? (obj[key] = value) : null;
    }
};
const applyLeafChange = (obj, change, embeddedKey) => {
    const { type, key, value } = change;
    switch (type) {
        case Operation.ADD:
            return addKeyValue(obj, key, value);
        case Operation.UPDATE:
            return modifyKeyValue(obj, key, value);
        case Operation.REMOVE:
            return removeKey(obj, key, embeddedKey);
    }
};
const applyArrayChange = (arr, change) => (() => {
    const result = [];
    for (const subchange of change.changes) {
        if (subchange.value != null || subchange.type === Operation.REMOVE) {
            result.push(applyLeafChange(arr, subchange, change.embeddedKey));
        }
        else {
            let element;
            if (change.embeddedKey === '$index') {
                element = arr[subchange.key];
            }
            else {
                element = (0, lodash_1.find)(arr, (el) => el[change.embeddedKey].toString() === subchange.key.toString());
            }
            result.push((0, exports.applyChangeset)(element, subchange.changes));
        }
    }
    return result;
})();
const applyBranchChange = (obj, change) => {
    if (Array.isArray(obj)) {
        return applyArrayChange(obj, change);
    }
    else {
        return (0, exports.applyChangeset)(obj, change.changes);
    }
};
const revertLeafChange = (obj, change, embeddedKey = '$index') => {
    const { type, key, value, oldValue } = change;
    switch (type) {
        case Operation.ADD:
            return removeKey(obj, key, embeddedKey);
        case Operation.UPDATE:
            return modifyKeyValue(obj, key, oldValue);
        case Operation.REMOVE:
            return addKeyValue(obj, key, value);
    }
};
const revertArrayChange = (arr, change) => (() => {
    const result = [];
    for (const subchange of change.changes) {
        if (subchange.value != null || subchange.type === Operation.REMOVE) {
            result.push(revertLeafChange(arr, subchange, change.embeddedKey));
        }
        else {
            let element;
            if (change.embeddedKey === '$index') {
                element = arr[+subchange.key];
            }
            else {
                element = (0, lodash_1.find)(arr, (el) => el[change.embeddedKey].toString() === subchange.key);
            }
            result.push((0, exports.revertChangeset)(element, subchange.changes));
        }
    }
    return result;
})();
const revertBranchChange = (obj, change) => {
    if (Array.isArray(obj)) {
        return revertArrayChange(obj, change);
    }
    else {
        return (0, exports.revertChangeset)(obj, change.changes);
    }
};
const diff = (oldObj, newObj, embeddedObjKeys) => compare(oldObj, newObj, [], embeddedObjKeys, []);
exports.diff = diff;
const applyChangeset = (obj, changeset) => {
    if (changeset) {
        changeset.forEach((change) => change.value !== undefined || change.type === Operation.REMOVE
            ? applyLeafChange(obj, change, change.embeddedKey)
            : applyBranchChange(obj[change.key], change));
    }
    return obj;
};
exports.applyChangeset = applyChangeset;
const revertChangeset = (obj, changeset) => {
    if (changeset) {
        changeset
            .reverse()
            .forEach((change) => !change.changes ? revertLeafChange(obj, change) : revertBranchChange(obj[change.key], change));
    }
    return obj;
};
exports.revertChangeset = revertChangeset;
var Operation;
(function (Operation) {
    Operation["REMOVE"] = "REMOVE";
    Operation["ADD"] = "ADD";
    Operation["UPDATE"] = "UPDATE";
})(Operation = exports.Operation || (exports.Operation = {}));
const flattenChangeset = (obj, path = '$', embeddedKey) => {
    if (Array.isArray(obj)) {
        return obj.reduce((memo, change) => [...memo, ...(0, exports.flattenChangeset)(change, path, embeddedKey)], []);
    }
    else {
        if (obj.changes || embeddedKey) {
            path = embeddedKey
                ? embeddedKey === '$index'
                    ? `${path}[${obj.key}]`
                    : obj.type === Operation.ADD
                        ? path
                        : `${path}[?(@.${embeddedKey}='${obj.key}')]`
                : (path = `${path}.${obj.key}`);
            return (0, exports.flattenChangeset)(obj.changes || obj, path, obj.embeddedKey);
        }
        else {
            const valueType = (0, exports.getTypeOfObj)(obj.value);
            return [
                Object.assign(Object.assign({}, obj), { path: valueType === 'Object' || path.endsWith(`[${obj.key}]`) ? path : `${path}.${obj.key}`, valueType })
            ];
        }
    }
};
exports.flattenChangeset = flattenChangeset;
const unflattenChanges = (changes) => {
    if (!Array.isArray(changes)) {
        changes = [changes];
    }
    const changesArr = [];
    changes.forEach((change) => {
        const obj = {};
        let ptr = obj;
        const segments = change.path.split(/([^@])\./).reduce((acc, curr, i) => {
            const x = Math.floor(i / 2);
            if (!acc[x]) {
                acc[x] = '';
            }
            acc[x] += curr;
            return acc;
        }, []);
        // $.childern[@.name='chris'].age
        // =>
        // $
        // childern[@.name='chris']
        // age
        if (segments.length === 1) {
            ptr.key = change.key;
            ptr.type = change.type;
            ptr.value = change.value;
            ptr.oldValue = change.oldValue;
            changesArr.push(ptr);
        }
        else {
            for (let i = 1; i < segments.length; i++) {
                const segment = segments[i];
                // check for array
                const result = /^(.+)\[\?\(@\.(.+)='(.+)'\)]$|^(.+)\[(\d+)\]/.exec(segment);
                // array
                if (result) {
                    let key;
                    let embeddedKey;
                    let arrKey;
                    if (result[1]) {
                        key = result[1];
                        embeddedKey = result[2];
                        arrKey = result[3];
                    }
                    else {
                        key = result[4];
                        embeddedKey = '$index';
                        arrKey = Number(result[5]);
                    }
                    // leaf
                    if (i === segments.length - 1) {
                        ptr.key = key;
                        ptr.embeddedKey = embeddedKey;
                        ptr.type = Operation.UPDATE;
                        ptr.changes = [
                            {
                                type: change.type,
                                key: arrKey,
                                value: change.value,
                                oldValue: change.oldValue
                            }
                        ];
                    }
                    else {
                        // object
                        ptr.key = key;
                        ptr.embeddedKey = embeddedKey;
                        ptr.type = Operation.UPDATE;
                        const newPtr = {};
                        ptr.changes = [
                            {
                                type: Operation.UPDATE,
                                key: arrKey,
                                changes: [newPtr]
                            }
                        ];
                        ptr = newPtr;
                    }
                }
                else {
                    // leaf
                    if (i === segments.length - 1) {
                        // check if value is a primitive or object
                        if (change.value !== null && change.valueType === 'Object') {
                            ptr.key = segment;
                            ptr.type = Operation.UPDATE;
                            ptr.changes = [
                                {
                                    key: change.key,
                                    type: change.type,
                                    value: change.value
                                }
                            ];
                        }
                        else {
                            ptr.key = change.key;
                            ptr.type = change.type;
                            ptr.value = change.value;
                            ptr.oldValue = change.oldValue;
                        }
                    }
                    else {
                        // branch
                        ptr.key = segment;
                        ptr.type = Operation.UPDATE;
                        const newPtr = {};
                        ptr.changes = [newPtr];
                        ptr = newPtr;
                    }
                }
            }
            changesArr.push(obj);
        }
    });
    return changesArr;
};
exports.unflattenChanges = unflattenChanges;
