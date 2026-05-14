/*
function () {
  var pagePath = {{DLV - page.name}};

  if(!pagePath) return "";
  
  var chunks = pagePath.split(":");
  
  if(chunks.length <= 1) return pagePath;

  if(chunks[chunks.length-1].includes("detail")) chunks.pop();

  return chunks.join(" > ");
}
*/

function getCategories() {
  var category; //= ({{DLV - ecommerce.items.0.item_category}} || "").trim();
  var category2; //= ({{DLV - ecommerce.items.0.item_category2}} || "").trim();
  var category3; //= ({{DLV - ecommerce.items.0.item_category3}} || "").trim();

  var chunks = [];

  if (category) chunks.push(category);
  if (category2) chunks.push(category2);
  if (category3) chunks.push(category3);

  if (chunks.length === 0) return "";

  return chunks.join(" > ");
}
