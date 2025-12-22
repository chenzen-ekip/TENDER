
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                // Authenticate the user here (Make sure only Admin can upload)
                // For MVP, we assume the route is protected or obscure enough
                // Ideally verify session here.

                return {
                    allowedContentTypes: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
                    tokenPayload: JSON.stringify({
                        // optional payload
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('blob upload completed', blob, tokenPayload);
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 }, // The webhook will retry 5 times automatically
        );
    }
}
