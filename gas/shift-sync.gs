/**
 * 草プロジェクト シフト自動連携（Google Apps Script）
 *
 * 「草プロ転送用シフト」（別館シフト転送スプシのコピー）の「シフト」シートを読み、
 * ①コマ = 朝担当 / ③コマ = 夜担当 として Supabase の shifts テーブルに書き込む。
 *
 * シートの形（1行目に日付、2〜4行目に①②③。日付の右2列に担当者2人）:
 *   N1="10/01"  N2="①" O2=樋口 P2=蕪木
 *               N3="②" O3=礼   P3=柿﨑
 *               N4="③" O4=迫田 P4=日上
 *
 * 初回だけ: スクリプトプロパティに SUPABASE_URL と SUPABASE_ANON_KEY を登録し、
 *           setupTrigger() を1回実行する（1時間ごとに自動反映）。
 * サイトの「更新」ボタン用: 「デプロイ」→「ウェブアプリ」で公開すると doGet() が呼ばれて即反映される。
 *
 * ※水やり未完了メールは別スクリプト（gas/mail-notify.gs、kusapurobekan@gmail.com で実行）に移動。
 */

const SOURCE_SPREADSHEET_ID = '1_-RvDGJxyyIflvK3ZasgGC6dO0sm2sRbIGAsAnOHCfE'
const SOURCE_SHEET_NAME = 'シフト'

// 表記ゆれの統一
const NAME_FIX = { '柿崎': '柿﨑' }

// 草プロのメンバーではない人（シフトに入っていても水やり担当にしない）
const NON_MEMBERS = ['沼田', '今川', '香川', '樋口', '宮本', 'キム']

/** メイン処理：シートを読んで Supabase に反映する */
function syncShifts() {
  const props = PropertiesService.getScriptProperties()
  const url = props.getProperty('SUPABASE_URL')
  const key = props.getProperty('SUPABASE_ANON_KEY')
  if (!url || !key) throw new Error('スクリプトプロパティに SUPABASE_URL / SUPABASE_ANON_KEY を設定してください')

  const sheet = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID).getSheetByName(SOURCE_SHEET_NAME)
  if (!sheet) throw new Error('シート「' + SOURCE_SHEET_NAME + '」が見つかりません')

  const values = sheet.getRange(1, 1, 4, sheet.getLastColumn()).getValues()
  const rows = []

  for (let c = 0; c < values[0].length; c++) {
    const date = toDateString(values[0][c])
    if (!date) continue

    const shift = { date: date, morning_names: [], evening_names: [] }
    for (let r = 1; r <= 3; r++) {
      const mark = String(values[r][c]).trim()
      const names = [values[r][c + 1], values[r][c + 2]]
        .map(cleanName)
        .filter(function (n) { return n !== '' && NON_MEMBERS.indexOf(n) === -1 })
      if (mark === '①') shift.morning_names = names
      if (mark === '③') shift.evening_names = names
    }
    rows.push(shift)
  }

  if (rows.length === 0) {
    console.log('日付が1つも読み取れませんでした。シートの形が変わっていないか確認してください')
    return 0
  }

  const res = UrlFetchApp.fetch(url.replace(/\/$/, '') + '/rest/v1/shifts?on_conflict=date', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    payload: JSON.stringify(rows),
    muteHttpExceptions: true,
  })

  const code = res.getResponseCode()
  if (code >= 300) throw new Error('Supabaseへの書き込みに失敗 (' + code + '): ' + res.getContentText())

  console.log('✅ ' + rows.length + '日分を反映しました（' + rows[0].date + ' 〜 ' + rows[rows.length - 1].date + '）')
  rows.forEach(function (s) {
    console.log(s.date + '  朝: ' + (s.morning_names.join('・') || 'なし') + '  夜: ' + (s.evening_names.join('・') || 'なし'))
  })
  return rows.length
}

/** サイトの「更新」ボタンから呼ばれる（ウェブアプリとして公開して使う） */
function doGet() {
  const lock = LockService.getScriptLock()
  let result
  try {
    lock.waitLock(20000)
    result = { ok: true, days: syncShifts() }
  } catch (e) {
    result = { ok: false, error: String(e) }
  } finally {
    lock.releaseLock()
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON)
}

/** 1行目のセル（"10/01" の文字列 or 日付型）を "YYYY-MM-DD" にする。日付でなければ null */
function toDateString(cell) {
  let month, day
  if (cell instanceof Date) {
    month = cell.getMonth() + 1
    day = cell.getDate()
  } else {
    const m = String(cell).trim().match(/^(\d{1,2})\/(\d{1,2})$/)
    if (!m) return null
    month = Number(m[1])
    day = Number(m[2])
  }
  // 年はシートに無いので今日から推定（12月に1月分を読む場合は翌年扱い）
  const now = new Date()
  let year = now.getFullYear()
  if (now.getMonth() + 1 === 12 && month === 1) year += 1
  if (now.getMonth() + 1 === 1 && month === 12) year -= 1
  return year + '-' + pad(month) + '-' + pad(day)
}

function cleanName(v) {
  const s = String(v == null ? '' : v).replace(/\s/g, '')
  return NAME_FIX[s] || s
}

function pad(n) { return ('0' + n).slice(-2) }

/** 実行：シフト取り込みを1時間ごとに自動実行する（前の設定は消してから作り直す）
 *  以前このスクリプトにあったメール用の自動実行（checkMorning / checkEvening）もここで消える */
function setupTrigger() {
  const handlers = ['syncShifts', 'checkMorning', 'checkEvening']
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (handlers.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t)
  })
  ScriptApp.newTrigger('syncShifts').timeBased().everyHours(1).create()
  console.log('✅ 自動実行を設定しました（シフト取り込み: 1時間ごと）')
}
