// import { NextResponse } from "next/server";
// import { db } from "@/lib/db";
// import { clients } from "@/lib/db/schema";
// import { sql } from "drizzle-orm";
// import { generateMagicToken } from "@/lib/auth/helpers";
// import { sendMagicLink } from "@/lib/services/email";

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
//     const { email } = body;

//     if (!email || typeof email !== "string") {
//       return NextResponse.json(
//         { error: "Email is required" },
//         { status: 400 }
//       );
//     }

//     const normalizedEmail = email.toLowerCase().trim();

//     const [client] = await db
//       .select()
//       .from(clients)
//       .where(sql`contact_email = ${normalizedEmail}`)
//       .limit(1);

//     if (!client) {
//       return NextResponse.json(
//         { error: "No account found with this email" },
//         { status: 404 }
//       );
//     }

//     const token = generateMagicToken(client.id);
//     await sendMagicLink(normalizedEmail, token);

//     return NextResponse.json(
//       { message: "Magic link sent successfully" },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Magic link error:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }


import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { generateMagicToken } from "@/lib/auth/helpers";
// import { sendMagicLink } from "@/lib/services/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [client] = await db
      .select()
      .from(clients)
      .where(sql`contact_email = ${normalizedEmail}`)
      .limit(1);

    if (!client) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 404 }
      );
    }

    const token = generateMagicToken(client.id);

    // --- DEV MODE: log magic link to console instead of sending email ---
    const magicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;
    console.log(`\n🔗 Magic link for ${normalizedEmail}:\n${magicUrl}\n`);
    // --- END DEV MODE ---

    // --- PRODUCTION: uncomment below and comment out the dev block above ---
    // await sendMagicLink(normalizedEmail, token);
    // --- END PRODUCTION ---

    return NextResponse.json(
      { message: "Magic link sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}