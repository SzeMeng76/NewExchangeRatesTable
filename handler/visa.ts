import axios from "axios";

export default async function exec(
  currencies: CurrenciesJson
): Promise<ResultData> {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const year = now.getFullYear();
  const dateString = `${month}/${day}/${year}`;

  const headers = {
    accept: "application/json, text/plain, */*",
    "accept-language": "en,zh-CN;q=0.9,zh;q=0.8",
    "sec-ch-ua":
      '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    Referer:
      "https://usa.visa.com/support/consumer/travel-support/exchange-rate-calculator.html",
    "Referrer-Policy": "no-referrer-when-downgrade",
  };

  const result: ResultData = {
    timestamp: Math.floor(Date.now() / 1000),
    data: {},
  };

  try {
    // 遍历每个货币获取汇率
    for (const currency in currencies) {
      if (currency === "USD") {
        result.data[currency] = 1;
        continue;
      }

      const endpoint = "https://usa.visa.com/cmsapi/fx/rates";
      try {
        const { data } = await axios.get(endpoint, {
          headers,
          params: {
            amount: 1,
            fee: 0,
            utcConvertedDate: dateString,
            exchangedate: dateString,
            fromCurr: currency,
            toCurr: "USD",
          },
        });

        // 根据 Visa API 的响应结构提取汇率
        if (data && data.convertedAmount) {
          // 移除逗号分隔符，然后解析为浮点数
          const cleanedAmount = data.convertedAmount.replace(/,/g, '');
          result.data[currency] = parseFloat(cleanedAmount);
        } else {
          result.data[currency] = -1;
        }
      } catch (error) {
        console.error(`获取 ${currency} 汇率失败`);
        result.data[currency] = -1;
      }
    }

    return result;
  } catch (error) {
    throw error;
  }
}
