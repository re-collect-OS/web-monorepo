const client = require("@sendgrid/mail");
const { SENDGRID_API_KEY, SENDGRID_TO_EMAIL, SENDGRID_FROM_EMAIL } = process.env;

exports.handler = async function (event, context, callback) {
  const { email, message } = JSON.parse(event.body);
  client.setApiKey(SENDGRID_API_KEY);

  let text = "New product feedback:\n\n";
  text += `Email: ${email}\n`;
  text += `Message: \n${message}`;

  const data = {
    to: SENDGRID_TO_EMAIL,
    from: SENDGRID_FROM_EMAIL,
    replyTo: email,
    subject: `[Feedback] from ${email}`,
    text: text,
  };

  try {
    await client.send(data);
    return {
      statusCode: 200,
      body: "success",
    };
  } catch (err) {
    return {
      statusCode: err.code,
      body: JSON.stringify({ msg: err.message }),
    };
  }
};
