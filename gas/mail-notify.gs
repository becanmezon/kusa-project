/**
 * 草プロジェクト 水やり未完了メール（Google Apps Script）
 *
 * kusapurobekan@gmail.com のアカウントで動かす。送り主はこのアカウントのアドレスになる。
 * 朝は11時、夜は20時の時点で、その日の記録（水やりした or 雨だった）が無ければメールを送る。
 *
 * 初回だけ:
 *   1. スクリプトプロパティに SUPABASE_URL と SUPABASE_ANON_KEY を登録
 *   2. setupMailTrigger() を1回実行
 * 送り先を変えたいときは、スクリプトプロパティ NOTIFY_EMAIL を追加すればそちらが優先される。
 */

// 送り先（スクリプトプロパティ NOTIFY_EMAIL があればそちらを使う）
const DEFAULT_NOTIFY_EMAIL = 't-bekan@mail.doshisha.ac.jp'

const APP_URL = 'https://kusa-project-6rdu.vercel.app'
// メールの送り主として受信側に表示される名前（アドレスは変わらない）
const MAIL_SENDER_NAME = '草プロジェクト'
// この日以降は通年で朝・夜の2回。それより前は7〜9月だけ夜あり（アプリと同じルール）
const DUAL_SLOT_FROM = '2026-10-17'

function hasEvening(dateStr) {
  if (dateStr >= DUAL_SLOT_FROM) return true
  const m = Number(dateStr.slice(5, 7))
  return m >= 7 && m <= 9
}

function todayJst() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd')
}

function supabaseGet(path) {
  const props = PropertiesService.getScriptProperties()
  const url = props.getProperty('SUPABASE_URL').replace(/\/$/, '')
  const key = props.getProperty('SUPABASE_ANON_KEY')
  const res = UrlFetchApp.fetch(url + '/rest/v1/' + path, {
    headers: { apikey: key, Authorization: 'Bearer ' + key },
    muteHttpExceptions: true,
  })
  if (res.getResponseCode() >= 300) throw new Error('Supabaseの読み込みに失敗 (' + res.getResponseCode() + '): ' + res.getContentText())
  return JSON.parse(res.getContentText())
}

/** その日・その枠の水やりが未完了ならメールを送る */
function checkAndNotify(slot) {
  const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || DEFAULT_NOTIFY_EMAIL

  const date = todayJst()
  if (slot === 'evening' && !hasEvening(date)) {
    console.log(date + ' は夜の水やりが無い日なのでスキップ')
    return
  }

  const done = supabaseGet('waterings?select=id&date=eq.' + date + '&slot=eq.' + slot)
  if (done.length > 0) {
    console.log(date + ' の' + (slot === 'morning' ? '朝' : '夜') + 'は記録済みなので送信しません')
    return
  }

  const shift = supabaseGet('shifts?select=morning_names,evening_names&date=eq.' + date)[0]
  const names = shift ? (slot === 'morning' ? shift.morning_names : shift.evening_names) : []
  const who = names && names.length ? names.join('・') : '担当なし'
  const label = slot === 'morning' ? '朝' : '夜'
  const deadline = slot === 'morning' ? '11時' : '20時'
  const md = Number(date.slice(5, 7)) + '/' + Number(date.slice(8, 10))

  MailApp.sendEmail({
    to: to,
    name: MAIL_SENDER_NAME,
    subject: '【草プロ】' + md + ' ' + label + 'の水やりがまだ記録されていません',
    body:
      md + ' の' + label + 'の水やりが、' + deadline + '時点でまだ記録されていません。\n\n' +
      '担当: ' + who + '\n\n' +
      '水やりした場合や雨だった場合は、アプリで記録をお願いします。\n' + APP_URL + '\n',
  })
  console.log('📧 ' + to + ' に送信しました（' + md + ' ' + label + ' / 担当: ' + who + '）')
}

function checkMorning() { checkAndNotify('morning') }
function checkEvening() { checkAndNotify('evening') }

/** 実行：朝11時・夜20時のチェックを自動実行に登録する（前の設定は消してから作り直す） */
function setupMailTrigger() {
  const handlers = ['checkMorning', 'checkEvening']
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (handlers.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t)
  })
  ScriptApp.newTrigger('checkMorning').timeBased().everyDays(1).atHour(11).nearMinute(0).inTimezone('Asia/Tokyo').create()
  ScriptApp.newTrigger('checkEvening').timeBased().everyDays(1).atHour(20).nearMinute(0).inTimezone('Asia/Tokyo').create()
  console.log('✅ 自動実行を設定しました（朝チェック: 11時 / 夜チェック: 20時）')
}

/** 動作確認用：記録の有無に関係なく、送り先にテストメールを1通送る */
function sendTestMail() {
  const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || DEFAULT_NOTIFY_EMAIL
  MailApp.sendEmail({
    to: to,
    name: MAIL_SENDER_NAME,
    subject: '【草プロ】テストメール',
    body: '草プロジェクトの水やり通知メールのテストです。\nこのメールが届いていれば設定は完了です。\n' + APP_URL + '\n',
  })
  console.log('📧 ' + to + ' にテストメールを送信しました')
}
