// 毎日 21:00 JST に Vercel Cron から呼ばれる「明日の担当」リマインド（朝・夜どちらも対象）。
import { handleReminder, type ApiRequest, type ApiResponse } from '../../server/reminder'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await handleReminder('tomorrow', req, res)
}
