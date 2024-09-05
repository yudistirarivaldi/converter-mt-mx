function convertMT103toMX(mtMessages) {
  const messages = mtMessages.split("}{2:O103"); // Split by transaction message
  const mxTemplates = messages.map((mtMessage) => {
    // Extracting values from MT103
    const referenceNumber = (mtMessage.match(/:20:(\S+)/) || [])[1] || "N/A";
    const senderDetails =
      (mtMessage.match(/:50K:(.*?)(?=:|$)/s) || [])[1]?.trim() || "N/A";
    const senderAccount =
      (mtMessage.match(/:50K:\/?(\S+)/) || [])[1]?.trim() || "N/A"; // Adjusted to handle account extraction better
    const beneficiaryDetails =
      (mtMessage.match(/:59:(.*?)(?=:|$)/s) || [])[1]?.trim() || "N/A";
    const beneficiaryAccount =
      (mtMessage.match(/:59:\/?(\S+)/) || [])[1]?.trim() || "N/A"; // Adjusted to handle account extraction better
    const currency =
      (mtMessage.match(/:32A:\d{6}([A-Z]{3})/) || [])[1] || "N/A";
    const amount =
      (mtMessage.match(/:32A:\d{6}[A-Z]{3}(\d+,\d{0,2})/) || [])[1]?.replace(
        ",",
        "."
      ) || "0.00";
    const executionDate = (mtMessage.match(/:32A:(\d{6})/) || [])[1]
      ? `20${mtMessage.match(/:32A:(\d{6})/)[1].slice(0, 2)}-${mtMessage
          .match(/:32A:(\d{6})/)[1]
          .slice(2, 4)}-${mtMessage.match(/:32A:(\d{6})/)[1].slice(4, 6)}`
      : new Date().toISOString().split("T")[0]; // Ensure correct date format
    const remittanceInfo =
      (mtMessage.match(/:70:(.*?)(?=:|$)/s) || [])[1]?.trim() || "N/A";
    const paymentMethod = (mtMessage.match(/:23B:(\S+)/) || [])[1] || "CRED"; // Default to CRED if not found

    // Split sender and beneficiary details into name and address
    const [senderName, ...senderAddressLines] = senderDetails
      .split("\n")
      .map((line) => line.trim());
    const [beneficiaryName, ...beneficiaryAddressLines] = beneficiaryDetails
      .split("\n")
      .map((line) => line.trim());

    // Creating the MX XML with dynamic values
    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
    <CstmrCdtTrfInitn>
        <GrpHdr>
            <MsgId>${referenceNumber}</MsgId>
            <CreDtTm>${new Date().toISOString()}</CreDtTm>
            <NbOfTxs>${messages.length}</NbOfTxs>
            <CtrlSum>${parseFloat(amount).toFixed(2)}</CtrlSum>
            <InitgPty>
                <Nm>${senderName}</Nm>
                <PstlAdr>
                  ${senderAddressLines
                    .map((line) => `<AdrLine>${line}</AdrLine>`)
                    .join("\n")}
                </PstlAdr>
            </InitgPty>
        </GrpHdr>
        <PmtInf>
            <PmtInfId>PAY${referenceNumber}</PmtInfId>
            <PmtMtd>${paymentMethod}</PmtMtd>
            <ReqdExctnDt>${executionDate}</ReqdExctnDt>
            <Dbtr>
                <Nm>${senderName}</Nm>
                <PstlAdr>
                  ${senderAddressLines
                    .map((line) => `<AdrLine>${line}</AdrLine>`)
                    .join("\n")}
                </PstlAdr>
            </Dbtr>
            <DbtrAcct>
                <Id>
                    <IBAN>${senderAccount}</IBAN>
                </Id>
            </DbtrAcct>
            <Cdtr>
                <Nm>${beneficiaryName}</Nm>
                <PstlAdr>
                  ${beneficiaryAddressLines
                    .map((line) => `<AdrLine>${line}</AdrLine>`)
                    .join("\n")}
                </PstlAdr>
            </Cdtr>
            <CdtrAcct>
                <Id>
                    <IBAN>${beneficiaryAccount}</IBAN>
                </Id>
            </CdtrAcct>
            <RmtInf>
                <Ustrd>${remittanceInfo}</Ustrd>
            </RmtInf>
        </PmtInf>
    </CstmrCdtTrfInitn>
</Document>`;
  });

  return mxTemplates.join("\n");
}
