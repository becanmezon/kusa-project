// 毎日 17:00 JST に Vercel Cron から呼ばれる「今日の夜担当」リマインド。
// 朝だけの日かどうかの判定は src/lib/wateringRule.ts に集約してある。
import { handleReminder, type ApiRequest, type ApiResponse } from '../../server/reminder'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await handleReminder('evening', req, res)
}
