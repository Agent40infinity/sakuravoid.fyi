using Microsoft.JSInterop;
using static sakuravoid.fyi.Shared.Basket;

namespace sakuravoid.fyi.Components
{
    public class Tebex
    {
        public static List<BasketItemModel> Basket = new();

        public static decimal BasketTotal => Basket.Sum(i => decimal.TryParse(i.Price, out var p) ? p : 0m);
        public static int TotalItemCount => Basket.Sum(i => i.Quantity);

        public static event Action<string?>? OnUpdate;

        public static async Task RefreshBasket(IJSRuntime js)
        {
            try
            {
                var basketData = await js.InvokeAsync<TebexBasketResponse>("getBasketDetails");

                if (basketData != null && basketData.packages != null)
                {
                    var originBasketCount = Basket.ToDictionary(i => i.PackageId, i => i.Quantity);
                    var addedPackageName = "";

                    Basket.Clear();
                    string currencyCode = string.IsNullOrEmpty(basketData.currency) ? "USD" : basketData.currency;

                    foreach (var package in basketData.packages)
                    {
                        int quantity = package.in_basket?.quantity > 0 ? package.in_basket.quantity : 1;
                        decimal unitPrice = package.in_basket?.price ?? 0m;

                        if (!originBasketCount.TryGetValue(package.id, out var oldQuantity) || quantity > oldQuantity)
                        {
                            addedPackageName = package.name;
                        }

                        Basket.Add(new BasketItemModel
                        {
                            PackageId = package.id,
                            Name = package.name ?? "Unknown Package",
                            Quantity = quantity,
                            Price = (unitPrice * quantity).ToString("F2"),
                            Currency = currencyCode
                        });
                    }

                    OnUpdate?.Invoke(addedPackageName);
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Error refreshing basket: " + ex.Message);
            }
        }

        public static async Task DecreaseQuantity(IJSRuntime js, long packageId, int currentQuantity)
        {
            int newQty = currentQuantity - 1;

            await js.InvokeVoidAsync("updatePackageQuantity", packageId, newQty);
            await Tebex.RefreshBasket(js);
        }
    }

    public class BasketItemModel
    {
        public long PackageId { get; set; }
        public string Name { get; set; } = "";
        public int Quantity { get; set; } = 1;
        public string Price { get; set; } = "0.00";
        public string Currency { get; set; } = "USD";
    }

    public class TebexBasketResponse
    {
        public List<TebexPackage> packages { get; set; } = new();
        public string currency { get; set; } = "USD";
    }

    public class TebexPackage
    {
        public long id { get; set; }
        public string name { get; set; } = "";
        public TebexInBasket in_basket { get; set; } = new();
    }

    public class TebexInBasket
    {
        public int quantity { get; set; }
        public decimal price { get; set; }
    }
}
