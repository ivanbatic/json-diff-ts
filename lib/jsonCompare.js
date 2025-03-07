"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compare = exports.applyChangelist = exports.enrich = exports.createContainer = exports.createValue = exports.CompareOperation = void 0;
const lodash_1 = require("lodash");
const jsonDiff_1 = require("./jsonDiff");
var CompareOperation;
(function (CompareOperation) {
    CompareOperation["CONTAINER"] = "CONTAINER";
    CompareOperation["UNCHANGED"] = "UNCHANGED";
})(CompareOperation = exports.CompareOperation || (exports.CompareOperation = {}));
const createValue = (value) => ({ type: CompareOperation.UNCHANGED, value });
exports.createValue = createValue;
const createContainer = (value) => ({
    type: CompareOperation.CONTAINER,
    value
});
exports.createContainer = createContainer;
const enrich = (object) => {
    const objectType = (0, jsonDiff_1.getTypeOfObj)(object);
    switch (objectType) {
        case 'Object':
            return (0, lodash_1.keys)(object)
                .map((key) => ({ key, value: (0, exports.enrich)(object[key]) }))
                .reduce((accumulator, entry) => {
                accumulator.value[entry.key] = entry.value;
                return accumulator;
            }, (0, exports.createContainer)({}));
        case 'Array':
            return (0, lodash_1.chain)(object)
                .map(value => (0, exports.enrich)(value))
                .reduce((accumulator, value) => {
                accumulator.value.push(value);
                return accumulator;
            }, (0, exports.createContainer)([]))
                .value();
        case 'Function':
            return undefined;
        case 'Date':
        default:
            // Primitive value
            return (0, exports.createValue)(object);
    }
};
exports.enrich = enrich;
const applyChangelist = (object, changelist) => {
    (0, lodash_1.chain)(changelist)
        .map(entry => (Object.assign(Object.assign({}, entry), { path: (0, lodash_1.replace)(entry.path, '$.', '.') })))
        .map(entry => (Object.assign(Object.assign({}, entry), { path: (0, lodash_1.replace)(entry.path, /(\[(?<array>\d)\]\.)/g, 'ARRVAL_START$<array>ARRVAL_END') })))
        .map(entry => (Object.assign(Object.assign({}, entry), { path: (0, lodash_1.replace)(entry.path, /(?<dot>\.)/g, '.value$<dot>') })))
        .map(entry => (Object.assign(Object.assign({}, entry), { path: (0, lodash_1.replace)(entry.path, /\./, '') })))
        .map(entry => (Object.assign(Object.assign({}, entry), { path: (0, lodash_1.replace)(entry.path, /ARRVAL_START/g, '.value[') })))
        .map(entry => (Object.assign(Object.assign({}, entry), { path: (0, lodash_1.replace)(entry.path, /ARRVAL_END/g, '].value.') })))
        .value()
        .forEach(entry => {
        switch (entry.type) {
            case jsonDiff_1.Operation.ADD:
            case jsonDiff_1.Operation.UPDATE:
                (0, lodash_1.set)(object, entry.path, { type: entry.type, value: entry.value, oldValue: entry.oldValue });
                break;
            case jsonDiff_1.Operation.REMOVE:
                (0, lodash_1.set)(object, entry.path, { type: entry.type, value: undefined, oldValue: entry.value });
                break;
            default:
                throw new Error();
        }
    });
    return object;
};
exports.applyChangelist = applyChangelist;
const compare = (oldObject, newObject) => {
    return (0, exports.applyChangelist)((0, exports.enrich)(oldObject), (0, jsonDiff_1.flattenChangeset)((0, jsonDiff_1.diff)(oldObject, newObject)));
};
exports.compare = compare;
