export type LoadState<T> = Loading | Loaded<T>;

export interface Loading {
    state: "loading";
}

export interface Loaded<T> {
    state: "loaded";
    value: T;
}
