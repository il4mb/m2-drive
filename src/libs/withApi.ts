import { NextRequest, NextResponse } from "next/server";

export interface IApi<T> {
    status: boolean;
    message: string;
    data?: T;
}

type AppRouteHandler<T> = (req: NextRequest) => Promise<IApi<T>> | IApi<T>;

export function withApi<T = unknown>(handler: AppRouteHandler<T>) {

    return async (req: NextRequest): Promise<Response> => {

        let data: any;

        try {

            const res = await handler(req as any);

            if (!res.status) {
                if (res.data) data = res.data;
                throw new Error(res.message);
            }

            return NextResponse.json(res, { status: 200 });

        } catch (err: any) {

            console.error(err);

            let status = 500;
            let message = "Internal Server Error";

            if (typeof err === "string") {
                const match = err.match(/^(\d{3}):/);
                if (match) status = parseInt(match[1], 10);
                message = err;
            } else if (err instanceof Error) {
                const match = err.message.match(/^(\d{3}):/);
                if (match) status = parseInt(match[1], 10);
                message = err.message;
            } else if (err.status && err.message) {
                status = err.status;
                message = err.message;
            }

            return NextResponse.json(
                { status: false, message, data },
                { status }
            );
        }
    }
}
