export function getAccountTypeLabel(type: string): string {
  switch (type) {
    case 'MAIN':
      return '메인 계좌';
    case 'SAVINGS':
      return '적금 계좌';
    default:
      return '계좌';
  }
}
