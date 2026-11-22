import { requireChatGPTUser } from './chatgpt-auth';
import PetApp from './pet-app';
export const dynamic = 'force-dynamic';
export default async function Home() {
  await requireChatGPTUser('/');
  return <PetApp />;
}
