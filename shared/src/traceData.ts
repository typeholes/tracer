import { z } from 'zod'

export type TypeLine = z.infer<typeof typeLine>
export const typeLine = z.object({
  id: z.number(),
  intrinsicName: z.string().optional(),
  recursionRelatedTypeIds: z.tuple([z.number(), z.array(z.number())]).optional(),
  flags: z.array(z.string()).optional(),
  ts: z.number().default(0).optional(),
  dur: z.number().optional(),
  display: z.string().optional(),
}).passthrough()

export type TraceLine = z.infer<typeof traceLine>
export const traceLine = z.object({
  pid: z.number(),
  tid: z.number(),
  ph: z.string(),
  cat: z.string(),
  ts: z.number(),
  name: z.string(),
  dur: z.number().optional(),
  args: z
    .object({
      kind: z.number().optional(),
      pos: z.number().optional(),
      end: z.number().optional(),
      location: z.object({
        line: z.number(),
        character: z.number(),
      }).passthrough().optional(),
      path: z.string().optional(),
      results: z
        .object({
          typeId: z.number().optional(),
        }).passthrough().optional(),
    })
    .optional(),
  results: z.object({}).optional(),
}).passthrough()

export type DataLine = TraceLine | TypeLine

export type TraceData = z.infer<typeof traceData>
export const traceData = z.array(typeLine.or(traceLine))
