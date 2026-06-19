import api from "./lib/api";

async function test() {
  try {
    const res = await api.get("admin/offers");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}
test();
