import { fetchUserPosts } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import ThreadCard from '../cards/ThreadCard';
import { fetchCommunityPosts } from '@/lib/actions/community.actions';

interface Props {
  currentUserId: string;
  accountId: string;
  accountType: string;
}
const ThreadsTab = async (props: Props) => {
  const { currentUserId, accountId, accountType } = props;
  let result: any;
  if (accountType === 'User') {
    result = await fetchUserPosts(accountId);
  } else if (accountType === 'Community') {
    result = await fetchCommunityPosts(accountId);
  }

  if (!result) redirect('/');
  return (
    <section className="mt-9 flex flex-col gap-10">
      {result.threads.map((thread: any) => (
        <ThreadCard
          key={thread._id}
          id={thread._id}
          currentUserId={currentUserId}
          parentId={thread.parentId}
          content={thread.text}
          author={
            accountType === 'User'
              ? { name: result.name, image: result.image, id: result.id }
              : { name: thread.name, image: thread.image, id: thread.id }
          }
          community={thread.community}
          createdAt={thread.createdAt}
          comments={thread.children}
          isComment={false}
        />
      ))}
    </section>
  );
};
export default ThreadsTab;
