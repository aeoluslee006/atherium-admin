import { redirect } from 'next/navigation';

export default function SellerPageRedirect() {
  redirect('/mypage/shop');
}
