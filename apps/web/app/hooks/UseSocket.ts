import { useEffect, useState } from "react";
import { WS_URL } from "../config";

export function useSocket() {
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<WebSocket>();

    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImIyYTkxOGFlLWE5MTEtNDIxYi05NmYxLTc2YzJlNjgxMzU5OSIsImlhdCI6MTc1MDYzMDc0Nn0.fgnjcrm-3sZkOlI8L7Q2yPi9s_Eyb154f7HMn2zzjsk`);
        ws.onopen = () => {
            setLoading(false);
            setSocket(ws);
        }
    }, []);

    return {
        socket,
        loading
    }

}