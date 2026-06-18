import type { Task, ChecklistItem } from "./types";
import { addDays, todayStr } from "./date";
import { uid } from "./utils";

function items(labels: string[], checkedCount = 0): ChecklistItem[] {
  return labels.map((label, i) => ({
    id: uid(),
    label,
    checked: i < checkedCount,
  }));
}

/** 앱 첫 실행 시 생성되는 샘플 업무 (가상 데이터) */
export function createSampleTasks(): Task[] {
  const now = new Date();
  const nowIso = now.toISOString();
  const today = todayStr();

  return [
    {
      id: uid(),
      title: "래미안베라힐즈 입찰하기",
      category: "bid",
      status: "inProgress",
      priority: "high",
      siteName: "래미안베라힐즈",
      requester: "김용준 부장님",
      dueDate: addDays(now, 1),
      memo: "나라장터 공고 기준. 현장설명회 참석 여부 확인 필요.",
      checklist: items(
        [
          "공고문 확인",
          "마감일 확인",
          "현장설명회 여부 확인",
          "입찰보증서 필요 여부 확인",
          "결격심사 서류 확인",
          "입찰 금액 확인",
          "제출 완료",
        ],
        3
      ),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: uid(),
      title: "신촌산수빌 중도금 계산서 발행",
      category: "accounting",
      status: "todo",
      priority: "urgent",
      siteName: "신촌산수빌",
      amount: 2000000,
      dueDate: today,
      checklist: items(
        ["청구 금액 확인", "부가세 확인", "세금계산서 발행", "거래처 제출"],
        0
      ),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: uid(),
      title: "한체대 계약보증서 메일 송부",
      category: "guarantee",
      status: "hold",
      priority: "normal",
      siteName: "한체대",
      confirmationNote: "담당자 회신 대기",
      dueDate: addDays(now, 3),
      checklist: items(["보증서 PDF 확인", "메일 송부", "회신 확인"], 2),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: uid(),
      title: "춘천산수빌 계약금 필요서류 송부",
      category: "certificate",
      status: "inProgress",
      priority: "high",
      siteName: "춘천산수빌",
      dueDate: addDays(now, 2),
      checklist: items(
        ["필요한 증명서 종류 확인", "발급", "PDF 저장", "제출 완료"],
        1
      ),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: uid(),
      title: "금당중흥 시방서 PDF 정리",
      category: "document",
      status: "todo",
      priority: "normal",
      siteName: "금당중흥",
      dueDate: addDays(now, 5),
      checklist: items(["원본 파일 확인", "스캔", "PDF 변환", "파일명 정리"], 0),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}
