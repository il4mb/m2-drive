import { withApi } from "@/libs/withApi";

export const POST = withApi(async (req) => {

    const json = await req.json();
    if (!json.email || !json.password) throw new Error("400: Invalid request");

    return {
        status: true,
        message: "Ok"
    }
});