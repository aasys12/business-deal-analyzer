function decodeHtml(s) {
  return String(s || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberFrom(text, re) {
  const m = text.match(re);
  return m ? Number(m[1].replace(/,/g, "")) : 0;
}

function textFrom(html, re) {
  const m = html.match(re);
  return m ? decodeHtml(m[1]) : "";
}

async function importListing(target) {
  let u;
  try {
    u = new URL(target);
  } catch {
    return Response.json({ ok: false, error: "Invalid URL" }, { status: 400 });
  }

  const allowed = ["www.bizbuysell.com", "bizbuysell.com"];
  if (!allowed.includes(u.hostname)) {
    return Response.json(
      { ok: false, error: "This MVP currently supports BizBuySell URLs only." },
      { status: 400 }
    );
  }

  const res = await fetch(u.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BusinessDealAnalyzer/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    return Response.json(
      { ok: false, error: "Source returned " + res.status },
      { status: 502 }
    );
  }

  const html = await res.text();
  const plain = decodeHtml(html);
  const title = textFrom(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);

  let location = "";
  const loc = plain.match(
    /(?:Business Location\s+)?Location:\s*([A-Za-z .'-]+(?:County)?,\s*[A-Z]{2})/i
  );
  if (loc) location = loc[1].trim();
  if (!location) {
    const m = plain.match(/([A-Za-z .'-]+County,\s*[A-Z]{2})/);
    if (m) location = m[1].trim();
  }

  const listing = {
    title,
    location,
    askingPrice: numberFrom(plain, /Asking Price\s*:?\s*\$?([\d,]+)/i),
    sde: numberFrom(
      plain,
      /Cash Flow\s*\(SDE\)\s*:?\s*\$?([\d,]+)/i
    ),
    revenue: numberFrom(plain, /Gross Revenue\s*:?\s*\$?([\d,]+)/i),
    ebitda: numberFrom(plain, /EBITDA\s*:?\s*\$?([\d,]+)/i),
    inventory: numberFrom(plain, /Inventory\s*:?\s*\$?([\d,]+)/i),
    ffe: numberFrom(
      plain,
      /Furniture,?\s*Fixtures,?\s*&\s*Equipment\s*\(FF&E\)\s*:?\s*\$?([\d,]+)/i
    ),
    employees: numberFrom(plain, /Employees\s*:?\s*(\d+)/i),
    leased: /Real Estate\s*:?\s*Leased/i.test(plain),
  };

  if (!listing.askingPrice && !listing.sde && !listing.revenue) {
    return Response.json(
      {
        ok: false,
        error:
          "Could not extract the listing. The source may be blocking server-side access.",
      },
      { status: 422 }
    );
  }

  return Response.json({ ok: true, source: u.toString(), listing });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/import") {
      const target = url.searchParams.get("url");
      if (!target) {
        return Response.json({ ok: false, error: "Missing url" }, { status: 400 });
      }
      return importListing(target);
    }

    return env.ASSETS.fetch(request);
  },
};
