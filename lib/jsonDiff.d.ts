import { Dictionary } from 'lodash';
declare type FunctionKey = (obj: any, getKeyName?: boolean) => any;
export declare const getTypeOfObj: (obj: any) => string;
export declare const diff: (oldObj: any, newObj: any, embeddedObjKeys?: Dictionary<string | FunctionKey>) => IChange[];
export declare const applyChangeset: (obj: any, changeset: Changeset) => any;
export declare const revertChangeset: (obj: any, changeset: Changeset) => any;
export declare enum Operation {
    REMOVE = "REMOVE",
    ADD = "ADD",
    UPDATE = "UPDATE"
}
export interface IChange {
    type: Operation;
    key: string;
    embeddedKey?: string | FunctionKey;
    value?: any | any[];
    oldValue?: any;
    changes?: IChange[];
}
export declare type Changeset = IChange[];
export interface IFlatChange {
    type: Operation;
    key: string;
    path: string;
    valueType: string | null;
    value?: any;
    oldValue?: any;
}
export declare const flattenChangeset: (obj: Changeset | IChange, path?: string, embeddedKey?: string | FunctionKey) => IFlatChange[];
export declare const unflattenChanges: (changes: IFlatChange | IFlatChange[]) => IChange[];
export {};
