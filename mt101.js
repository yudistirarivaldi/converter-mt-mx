function convertMT101toMX(mtMessage) {
  const referenceNumber =
    (mtMessage.match(/:20:(.*)/) || [])[1]?.trim() || "N/A";
  const senderName =
    (mtMessage.match(/:50H:(?:.*)\n(.*)/) || [])[1]?.trim() || "N/A";
  const accountNumber =
    (mtMessage.match(/:50H:\/(\d+)/) || [])[1]?.trim() || "N/A";
  const executionDateRaw =
    (mtMessage.match(/:30:(.*)/) || [])[1]?.trim() || "N/A";
  const executionDate = executionDateRaw
    ? `${executionDateRaw.slice(0, 4)}-${executionDateRaw.slice(
        4,
        6
      )}-${executionDateRaw.slice(6, 8)}`
    : "N/A";

  const bicReceiver =
    (mtMessage.match(/:57A:([A-Z0-9]+)/) || [])[1]?.trim() || "N/A"; // Extract BIC dynamically

  const transactions = [];
  const transactionRegex =
    /:32B:([A-Z]{3})(\d+,\d+)\s*:59:\/(\d+)\s*([\s\S]*?):70:(.*)/g;
  let match;
  while ((match = transactionRegex.exec(mtMessage)) !== null) {
    const currency = match[1];
    const amount = parseFloat(match[2].replace(",", "."));
    const beneficiaryAccount = match[3];
    const beneficiaryName = match[4].trim().split("\n")[0];
    const remittanceInfo = match[5].trim();

    transactions.push({
      currency,
      amount,
      beneficiaryAccount,
      beneficiaryName,
      remittanceInfo,
    });
  }

  let transactionElements = "";
  let totalSum = 0;
  transactions.forEach((tx, index) => {
    totalSum += tx.amount;
    transactionElements += `
        <CdtTrfTxInf>
            <PmtId>
                <EndToEndId>${referenceNumber}-${index + 1}</EndToEndId>
            </PmtId>
            <Amt>
                <InstdAmt Ccy="${tx.currency}">${tx.amount.toFixed(
      2
    )}</InstdAmt>
            </Amt>
            <CdtrAgt>
                <FinInstnId>
                    <BIC>${bicReceiver}</BIC>
                </FinInstnId>
            </CdtrAgt>
            <Cdtr>
                <Nm>${tx.beneficiaryName}</Nm>
            </Cdtr>
            <CdtrAcct>
                <Id>
                    <IBAN>${tx.beneficiaryAccount}</IBAN>
                </Id>
            </CdtrAcct>
            <RmtInf>
                <Ustrd>${tx.remittanceInfo}</Ustrd>
            </RmtInf>
        </CdtTrfTxInf>`;
  });

  const paymentMethod = "TRF"; // Kamu bisa dinamiskan berdasarkan logika dari data MT
  const paymentInfoId = `PAY${referenceNumber}`; // Bisa disesuaikan dengan data lain di MT

  const mxTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
    <CstmrCdtTrfInitn>
        <GrpHdr>
            <MsgId>${referenceNumber}</MsgId>
            <CreDtTm>${new Date().toISOString()}</CreDtTm>
            <NbOfTxs>${transactions.length}</NbOfTxs>
            <CtrlSum>${totalSum.toFixed(2)}</CtrlSum>
            <InitgPty>
                <Nm>${senderName}</Nm>
            </InitgPty>
        </GrpHdr>
        <PmtInf>
            <PmtInfId>${paymentInfoId}</PmtInfId>
            <PmtMtd>${paymentMethod}</PmtMtd>
            <ReqdExctnDt>${executionDate}</ReqdExctnDt>
            <Dbtr>
                <Nm>${senderName}</Nm>
            </Dbtr>
            <DbtrAcct>
                <Id>
                    <IBAN>${accountNumber}</IBAN>
                </Id>
            </DbtrAcct>
            ${transactionElements}
        </PmtInf>
    </CstmrCdtTrfInitn>
</Document>`;

  return mxTemplate;
}
