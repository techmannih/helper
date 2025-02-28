import { Body, Container, Head, Hr, Html, Img, Link, Preview, Tailwind, Text } from "@react-email/components";
import * as React from "react";
import { getBaseUrl } from "@/components/constants";
import tailwindConfig from "../../tailwind.config";

type Props = {
  widgetHost: string;
  companyName: string;
  emailSubject: string | null;
};

const baseUrl = getBaseUrl();

const AutoReplyEmail = ({ companyName, widgetHost, emailSubject }: Props) => (
  <Html>
    <Tailwind config={tailwindConfig}>
      <Head />
      <Preview>Continue the conversation in our live chat</Preview>
      <Body className="bg-white font-system-ui">
        <Container className="px-3 mx-auto">
          <Text className="text-neutral-700 text-sm my-6">
            Continue your conversation{emailSubject ? ` about ${emailSubject}` : ""} with {companyName} directly in our
            live chat.
          </Text>
          <Link href={widgetHost} target="_blank" className="text-blue-700 text-sm underline block mb-4">
            Click here to continue the conversation
          </Link>
          <Text className="text-neutral-500 text-xs leading-[22px] mt-3 mb-6">
            You'll see a notification message appear in the chat widget under the same subject line.
          </Text>
          <Hr />
          <Text className="text-neutral-500 text-xs leading-[22px] mt-3 mb-6">
            Powered by{" "}
            <Link
              href={`https://helper.ai?utm_source=auto-reply-email&utm_medium=email`}
              target="_blank"
              className="text-neutral-500 no-underline"
            >
              <Img
                src={`${baseUrl}/logo_mahogany_900_for_email.png`}
                width="64"
                alt="Helper Logo"
                className="align-middle ml-0.5"
              />
            </Link>
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

AutoReplyEmail.PreviewProps = {
  companyName: "Gumroad",
  widgetHost: "https://example.com",
  emailSubject: "How to trigger a instant payout?",
} as Props;

export default AutoReplyEmail;
