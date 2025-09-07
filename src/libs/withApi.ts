import { NextRequest, NextResponse } from "next/server";

export interface ApiResponse<T> {
    status: boolean;
    message: string;
    data?: T;
}

export interface NextRequestContext<J> extends Omit<NextResponse, 'json'> {
    json: () => Promise<J>;
}

export interface NextResponseContext<P = any> extends NextResponse {
    params: Promise<P>;
}

export type ApiHandler<T, Json, Param=any> = (req: NextRequestContext<Json>, res?: NextResponseContext<Param>) => Promise<ApiResponse<T>> | ApiResponse<T>;

export function withApi<T = any, Json = any, Param = any>(handler: ApiHandler<T, Json, Param>) {

    return async (req: NextRequest, res: NextResponse): Promise<Response> => {

        let data: any;

        try {

            const response = await handler(req as any, res as any);

            if (!response.status) {
                if (response.data) data = response.data;
                throw new Error(response.message);
            }

            return NextResponse.json(response, { status: 200 });

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

export interface IAction<R> {
    status: boolean;
    message: string;
    code: number;
    data?: R;
}
type ActionHandler<T, R= any> = (data: T) => Promise<Omit<IAction<R>, 'code'>>;
export function withAction<T = any, R = any>(handler: ActionHandler<T, R>) {

    return async (payload: T) => {
        let data: R;

        try {

            const res = await handler(payload);
            if (!res.status) {
                if (res.data) data = res.data;
                throw new Error(res.message);
            }

            return { code: 200, ...res };

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

            return {
                status: false,
                code: status,
                message,
                // @ts-ignore
                data
            }
        }
    }
}       