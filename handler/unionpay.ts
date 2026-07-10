import axios from "axios";

const formatDate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}${month}${day}`;
};

export default async function exec(
  currencies: CurrenciesJson
): Promise<ResultData> {
  const now = new Date();
  const result: ResultData = {
    timestamp: Math.floor(Date.now() / 1000),
    data: {},
  };

  const endpoint = "https://www.unionpayintl.com/upload/jfimg/";
  try {
    let data;
    try {
      // 优先尝试当天的数据
      const response = await axios.get(endpoint + `${formatDate(now)}.json`);
      data = response.data;
    } catch (error) {
      // 当天数据可能还未生成，回退到前一天
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      console.log(`unionpay: 当天数据获取失败，尝试前一天: ${formatDate(yesterday)}`);
      const response = await axios.get(endpoint + `${formatDate(yesterday)}.json`);
      data = response.data;
    }

    for (const currency in currencies) {
      if (currency === "USD") {
        result.data[currency] = 1;
        continue;
      }

      const target = data.exchangeRateJson.find(
        (item: UnionPayData) =>
          item.transCur === currency && item.baseCur === "USD"
      );
      if (target) {
        result.data[currency] = 1 / target.rateData;
      } else {
        result.data[currency] = -1;
      }
    }
    return result;
  } catch (error) {
    throw error;
  }
}
