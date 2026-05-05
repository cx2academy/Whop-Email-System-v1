/**
 * lib/prisma.ts
 *
 * Convenience re-export of the Prisma client singleton.
 * The canonical client lives at @/lib/db/client.
 *
 * Import preference:
 *   import { db } from "@/lib/db/client";  ← preferred (explicit)
 *   import prisma from "@/lib/prisma";      ← legacy alias
 */

export { db as default, db as prisma } from "@/lib/db/client";
