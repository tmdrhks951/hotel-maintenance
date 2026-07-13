import { env } from '@/config/env';
import { AppError } from '@/common/errors/AppError';

// ================================================================
// SMS 발송 어댑터
//
// SMS_PROVIDER=none  (기본): 미연동 — 프로덕션에서 발송 시도 시 명확한 503
// SMS_PROVIDER=aligo        : 알리고(smartsms.aligo.in) 문자 API
//   필요 환경변수: ALIGO_API_KEY, ALIGO_USER_ID, SMS_SENDER(사전 등록된 발신번호)
// ================================================================

const ALIGO_SEND_URL = 'https://apis.aligo.in/send/';

async function sendViaAligo(phone: string, message: string): Promise<void> {
  if (!env.ALIGO_API_KEY || !env.ALIGO_USER_ID || !env.SMS_SENDER) {
    throw new AppError(
      'SMS 설정이 완전하지 않습니다 (ALIGO_API_KEY/ALIGO_USER_ID/SMS_SENDER)',
      503,
      true,
      'SMS_NOT_CONFIGURED',
    );
  }

  const form = new URLSearchParams({
    key: env.ALIGO_API_KEY,
    user_id: env.ALIGO_USER_ID,
    sender: env.SMS_SENDER,
    receiver: phone,
    msg: message,
    msg_type: 'SMS',
  });

  const res = await fetch(ALIGO_SEND_URL, { method: 'POST', body: form });
  if (!res.ok) {
    throw new AppError('문자 발송에 실패했습니다. 잠시 후 다시 시도해주세요', 502, true, 'SMS_SEND_FAILED');
  }

  // 알리고 응답: { result_code: "1" } 이 성공, 그 외는 실패
  const body = (await res.json()) as { result_code?: string | number; message?: string };
  if (String(body.result_code) !== '1') {
    console.error('[sms] aligo send failed:', body.result_code, body.message);
    throw new AppError('문자 발송에 실패했습니다. 잠시 후 다시 시도해주세요', 502, true, 'SMS_SEND_FAILED');
  }
}

/**
 * 인증코드 등 문자 발송. 프로바이더 미설정 시 명확한 에러를 던진다
 * (조용히 성공한 척해서 사용자가 오지 않는 문자를 기다리게 하지 않음).
 */
export async function sendSms(phone: string, message: string): Promise<void> {
  switch (env.SMS_PROVIDER) {
    case 'aligo':
      await sendViaAligo(phone, message);
      return;
    case 'none':
    default:
      throw new AppError(
        '문자 발송 기능이 아직 설정되지 않았습니다. 관리자에게 문의하세요',
        503,
        true,
        'SMS_NOT_CONFIGURED',
      );
  }
}

export function isSmsConfigured(): boolean {
  return env.SMS_PROVIDER !== 'none';
}
