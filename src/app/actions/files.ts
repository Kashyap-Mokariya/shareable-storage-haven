"use server"

import { createClient } from "@/lib/supabase/server"
import { parseStringify } from "@/lib/utils";

interface Props {
    email: string | null
    userId: string | null
}

const handleError = (error: unknown, message: string) => {
    console.log(error, message)
    throw error
};

export const getFiles = async (
    {
        userId,
        email
    }: Props
) => {
    const supabase = await createClient();

    try {
        if (!userId) {
            throw new Error("User ID is required");
        }
        if (!email) {
            throw new Error("Email is required");
        }

        console.log("UserId: ", userId)
        console.log("Email: ", email)

        // Updated query to fetch both owned files and shared files
        const { data, error } = await supabase
            .from("files")
            .select('*')
            .or(`user_id.eq.${userId},shared_with.cs.{${email}}`)
            .order("created_at", { ascending: false });

        if (error) {
            return {
                error: error.message || "Failed to fetch files",
                success: false,
                data: null
            }
        }

        console.log("Data: ", data)

        return parseStringify(data)

    } catch (error) {
        handleError(error, "Failed to get files");
    }
}