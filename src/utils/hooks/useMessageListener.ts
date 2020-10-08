import * as React from 'react';

export function useMessageListener(onMessage: (message: any) => void) {
    React.useEffect(() => {
        window.addEventListener("message", handleReceiveMessage);
        return () => window.removeEventListener("message", handleReceiveMessage);
    }, []);

    const handleReceiveMessage = (event: any) => {
        onMessage(event.data);
    };
}
