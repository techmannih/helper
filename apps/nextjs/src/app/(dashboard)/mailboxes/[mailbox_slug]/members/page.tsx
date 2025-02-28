import { PeopleTable } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/members/_components/peopleTable";
import { PageContainer } from "@/components/pageContainer";
import { PageContent } from "@/components/pageContent";
import { PageHeader } from "@/components/pageHeader";
import { withMailboxAuth } from "@/components/withMailboxAuth";

type PageProps = {
  mailbox_slug: string;
};

const MembersPage = async (props: { params: Promise<PageProps> }) => {
  const params = await props.params;

  return (
    <PageContainer>
      <PageHeader title="Member Reply Counts" />
      <PageContent>
        <PeopleTable mailboxSlug={params.mailbox_slug} timeRange="1y" />
      </PageContent>
    </PageContainer>
  );
};

export default withMailboxAuth(MembersPage);
