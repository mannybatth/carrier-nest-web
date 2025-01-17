import nodemailer from 'nodemailer';

export async function sendVerificationRequest({ identifier: email, url, provider: { server, from } }) {
    const { host } = new URL(url);
    const transport = nodemailer.createTransport(server);
    await transport.sendMail({
        to: email,
        from,
        subject: `Your Carrier Nest login link`,
        text: text({ url, host }),
        html: html({ url, host, email }),
    });
}

// Email HTML body
function html({ url, host, email }: Record<'url' | 'host' | 'email', string>) {
    // Insert invisible space into domains and email address to prevent both the
    // email address and the domain from being turned into a hyperlink by email
    // clients like Outlook and Apple mail, as this is confusing because it seems
    // like they are supposed to click on their email address to sign in.
    const escapedEmail = `${email.replace(/\./g, '&#8203;.')}`;
    const escapedHost = `${host.replace(/\./g, '&#8203;.')}`;

    return `
<body style="background: #fff;">
<table bgcolor="#fff" border="0" cellpadding="0" cellspacing="0" width="100%" style="border:0;margin:0;padding:0">
  <tbody>
    <tr>
      <td>
        <table align="center" border="0" cellpadding="0" cellspacing="0"
          style="width:480px;min-width:480px;max-width:480px">
          <tbody>
            <tr>
              <td>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tbody>
                    <tr>
                      <td height="58" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px;max-height:1px">
                        <div>&nbsp;</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table cellpadding="0" cellspacing="0">
                  <tbody>
                    <tr>
                      <td valign="middle" height="58"
                        style="border:0;border-collapse:collapse;margin:0;padding:0;height:58px">
                        <a style="border:0;margin:0;padding:0;text-decoration:none;outline:0"
                          href="https://carriernest.com"
                          target="_blank">
                          <div>
                            <div
                              style="width:80px;height:58px;text-align:center;background-color:white;background-position:center;background:url('https://carriernest.com/logo_truck_100.png');background-origin:border-box;background-size:contain;background-position:center;background-repeat:no-repeat;line-height:100%">
                              <div>
                                <div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </a>
                      </td>
                      <td style="border:0;border-collapse:collapse;margin:0;padding:0;width:8px">
                        <span
                          style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;text-decoration:none">
                          &nbsp;
                        </span>
                      </td>
                      <td valign="bottom" style="border:0;border-collapse:collapse;margin:0;padding:0px 0px 0px 5px;">
                        <span
                          style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;text-decoration:none;font-weight:500;color:rgb(0,0,0);font-size:26px">
                          Carrier Nest
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tbody>
                    <tr>
                      <td height="32" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px;max-height:1px">
                        <div>&nbsp;</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table cellpadding="0" cellspacing="0" style="width:100%">
                  <tbody>
                    <tr>
                      <td>
                        <table cellpadding="0" cellspacing="0" style="width:100%">
                          <tbody>
                            <tr>
                              <td
                                style="border:0;border-collapse:collapse;margin:0;padding:0;width:100%;width:482px;border-radius:12px;background-color:#e3e8ee;padding:1px">
                                <table cellpadding="0" cellspacing="0"
                                  style="width:100%;background-color:#ffffff;border-radius:12px">
                                  <tbody>
                                    <tr>
                                      <td style="border:0;border-collapse:collapse;margin:0;padding:0">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                          <tbody>
                                            <tr>
                                              <td height="32"
                                                style="border:0;margin:0;padding:0;font-size:1px;line-height:1px;max-height:1px">
                                                <div>&nbsp;</div>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                        <table cellpadding="0" cellspacing="0" style="width:100%">
                                          <tbody>
                                            <tr>
                                              <td
                                                style="border:0;border-collapse:collapse;margin:0;padding:0;min-width:32px;width:32px;font-size:1px">
                                                &nbsp;
                                              </td>
                                              <td style="border:0;border-collapse:collapse;margin:0;padding:0">
                                                <span
                                                  style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;text-decoration:none;color:#303030;font-size:20px;line-height:28px;font-weight:600">
                                                  Log in to Carrier Nest
                                                </span>
                                                <table cellpadding="0" cellspacing="0" style="width:100%">
                                                  <tbody>
                                                    <tr>
                                                      <td
                                                        style="border:0;border-collapse:collapse;margin:0;padding:0;width:100%;color:#4d4d4d;font-size:14px;line-height:16px;padding-top:16px;padding-bottom:20px">
                                                        <p
                                                          style="border:0;margin:0;padding:0;font-family:-apple-system,'SF Pro Display','SF Pro Text','Helvetica',sans-serif">
                                                          Here’s your requested email link to log in to your Carrier Nest portal.
                                                        </p>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                                <table cellpadding="0" cellspacing="0" style="width:100%">
                                                  <tbody>
                                                    <tr>
                                                      <td
                                                        style="border:0;border-collapse:collapse;margin:0;padding:0;width:100%;text-align:center;background-color:#9A3412;border-radius:6px;height:44px">
                                                        <a style="border:0;margin:0;padding:0;text-decoration:none;outline:0;display:block;text-align:center;padding-right:60px;padding-left:60px"
                                                          href="${url}"
                                                          target="_blank">
                                                          <span
                                                            style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;text-decoration:none;font-weight:500;font-size:16px;line-height:44px;color:rgb(255,255,255)">
                                                            Log in
                                                          </span>
                                                        </a>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                                <table cellpadding="0" cellspacing="0" style="width:100%">
                                                  <tbody>
                                                    <tr>
                                                      <td
                                                        style="border:0;border-collapse:collapse;margin:0;padding:0;width:100%;color:#4d4d4d;font-size:14px;line-height:16px;padding-top:16px">
                                                        <p
                                                          style="border:0;margin:0;padding:0;font-family:-apple-system,'SF Pro Display','SF Pro Text','Helvetica',sans-serif">
                                                          If you’re not trying to log in, you can safely ignore this
                                                          email.
                                                        </p>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                                <table cellpadding="0" cellspacing="0"
                                                  style="padding-top:20px;width:100%">
                                                  <tbody>
                                                    <tr>
                                                      <td
                                                        style="border:0;border-collapse:collapse;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;font-size:12px;line-height:16px;color:#6a7383">
                                                        <p
                                                          style="border:0;margin:0;padding:0;font-family:-apple-system,'SF Pro Display','SF Pro Text','Helvetica',sans-serif">
                                                          Please note: This email contains a link that should only be
                                                          used by you. Do not forward this email.
                                                        </p>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                                <table cellpadding="0" cellspacing="0" style="width:100%">
                                                  <tbody>
                                                    <tr>
                                                      <td colspan="1" height="24"
                                                        style="border:0;border-collapse:collapse;margin:0;padding:0;height:24px;font-size:1px;line-height:1px">
                                                        &nbsp;
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td height="1"
                                                        style="border:0;border-collapse:collapse;margin:0;padding:0;height:1px;font-size:1px;background-color:#ebebeb;line-height:1px">
                                                        &nbsp;
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td colspan="1" height="24"
                                                        style="border:0;border-collapse:collapse;margin:0;padding:0;height:24px;font-size:1px;line-height:1px">
                                                        &nbsp;
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                                <table cellpadding="0" cellspacing="0" style="width:100%">
                                                  <tbody>
                                                    <tr>
                                                      <td
                                                        style="border:0;border-collapse:collapse;margin:0;padding:0;width:100%;text-align:center">
                                                        <table cellpadding="0" cellspacing="0" style="width:100%">
                                                          <tbody>
                                                            <tr>
                                                              <td
                                                                style="border:0;border-collapse:collapse;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;font-size:14px;line-height:16px;color:#4d4d4d;text-align:center">
                                                                Questions? Contact us at <a
                                                                  style="border:0;margin:0;padding:0;color:#9A3412!important;font-weight:bold;text-decoration:none;white-space:nowrap"
                                                                  href="mailto:info@carriernest.com"
                                                                  target="_blank">info@carriernest.com</a>.
                                                              </td>
                                                            </tr>
                                                          </tbody>
                                                        </table>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </td>
                                              <td
                                                style="border:0;border-collapse:collapse;margin:0;padding:0;min-width:32px;width:32px;font-size:1px">
                                                &nbsp;
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                          <tbody>
                                            <tr>
                                              <td height="24"
                                                style="border:0;margin:0;padding:0;font-size:1px;line-height:1px;max-height:1px">
                                                <div>&nbsp;</div>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tbody>
                    <tr>
                      <td height="32" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px;max-height:1px">
                        <div>&nbsp;</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>
</body>
`;
}

// Email Text body (fallback for email clients that don't render HTML, e.g. feature phones)
function text({ url, host }: Record<'url' | 'host', string>) {
    return `Sign in to Carrier Nest\n\nHere’s your requested email link to log in to your Carrier Nest portal.\n\n${url}\n\n`;
}
