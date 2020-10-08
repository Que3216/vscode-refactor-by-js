import { DependencyList, EffectCallback } from "react";
import * as React from 'react';
import { debounce } from "lodash-es";

export function useDebouncedEffect(effect: EffectCallback, timeout: number = 1000, deps?: DependencyList) {
    const latestCallbackWrapper = React.useRef(effect);

    React.useEffect(() => {
        latestCallbackWrapper.current = effect;
    }, [effect]);

    const debouncedFunction = React.useMemo(() => debounce(() => latestCallbackWrapper.current(), timeout), [timeout]);
    React.useEffect(() => debouncedFunction(), deps);
}
