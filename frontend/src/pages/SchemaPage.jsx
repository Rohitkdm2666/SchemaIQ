import { useState } from 'react'
import { Panel, PanelHeader, PanelBody, Tag, Button } from '../components/ui.jsx'

const TABLES_DATA = {
  customers: { rows:99441, cols:5, pk:'customer_id', fks:[], color:'#c0392b', summary:'Stores one record per order placement, not per unique person. Use customer_unique_id to track repeat buyers. Primarily used for delivery geolocation and regional segmentation.',
    columns:[
      {name:'customer_id',type:'VARCHAR(32)',tags:['PK','NOT NULL'],nullPct:'0%',distinct:'99,441',desc:'Hashed unique ID per order. Primary join key across orders and reviews.'},
      {name:'customer_unique_id',type:'VARCHAR(32)',tags:['NOT NULL'],nullPct:'0%',distinct:'96,096',desc:'Persistent identifier for the same physical customer across multiple orders.'},
      {name:'customer_zip_code_prefix',type:'INT',tags:['NOT NULL','IDX'],nullPct:'0%',distinct:'14,994',desc:'First 5 digits of postal code. Join to geolocation for lat/lng.'},
      {name:'customer_city',type:'VARCHAR(64)',tags:['NOT NULL'],nullPct:'0%',distinct:'4,119',desc:'City name derived from postal code. May contain inconsistent casing.'},
      {name:'customer_state',type:'CHAR(2)',tags:['NOT NULL'],nullPct:'0%',distinct:'27',desc:'Two-letter Brazilian state abbreviation (e.g. SP, RJ, MG).'},
    ]},
  orders: { rows:99441, cols:8, pk:'order_id', fks:['customer_id → customers'], color:'#2980b9', summary:'Central fact table. Each row is one complete order lifecycle. Connects to customers, order_items, payments, and reviews — the primary join hub of the schema.',
    columns:[
      {name:'order_id',type:'VARCHAR(32)',tags:['PK','NOT NULL'],nullPct:'0%',distinct:'99,441',desc:'Unique order hash ID. Most important join key — referenced by 4 downstream tables.'},
      {name:'customer_id',type:'VARCHAR(32)',tags:['FK','NOT NULL'],nullPct:'0%',distinct:'99,441',desc:'Foreign key to customers.customer_id.'},
      {name:'order_status',type:'VARCHAR(16)',tags:['NOT NULL'],nullPct:'0%',distinct:'8',desc:'Lifecycle status: delivered, shipped, processing, canceled, etc.'},
      {name:'order_purchase_timestamp',type:'TIMESTAMP',tags:['NOT NULL'],nullPct:'0%',distinct:'98,875',desc:'UTC timestamp when customer placed the order.'},
      {name:'order_approved_at',type:'TIMESTAMP',tags:['NULLABLE'],nullPct:'0.1%',distinct:'98,043',desc:'Payment approval timestamp. Null if still pending.'},
      {name:'order_delivered_carrier_date',type:'TIMESTAMP',tags:['NULLABLE'],nullPct:'2.9%',distinct:'63,573',desc:'When seller handed package to carrier.'},
      {name:'order_delivered_customer_date',type:'TIMESTAMP',tags:['NULLABLE'],nullPct:'2.9%',distinct:'63,573',desc:'Actual delivery datetime.'},
      {name:'order_estimated_delivery_date',type:'TIMESTAMP',tags:['NOT NULL'],nullPct:'0%',distinct:'459',desc:'Estimated delivery date shown at purchase.'},
    ]},
  order_items: { rows:112650, cols:7, pk:null, fks:['order_id → orders','product_id → products','seller_id → sellers'], color:'#9b59b6', summary:'Bridge table connecting orders, products, and sellers. One order can contain multiple items from different sellers. Contains pricing and freight data per item.',
    columns:[
      {name:'order_id',type:'VARCHAR(32)',tags:['FK','NOT NULL'],nullPct:'0%',distinct:'98,666',desc:'References the parent order.'},
      {name:'order_item_id',type:'INT',tags:['NOT NULL'],nullPct:'0%',distinct:'21',desc:'Sequence number of the item within an order.'},
      {name:'product_id',type:'VARCHAR(32)',tags:['FK','NOT NULL'],nullPct:'0%',distinct:'32,951',desc:'References products.product_id.'},
      {name:'seller_id',type:'VARCHAR(32)',tags:['FK','NOT NULL'],nullPct:'0%',distinct:'3,095',desc:'References sellers.seller_id.'},
      {name:'shipping_limit_date',type:'TIMESTAMP',tags:['NOT NULL'],nullPct:'0%',distinct:'85,019',desc:'Deadline by which seller must ship the item.'},
      {name:'price',type:'NUMERIC(10,2)',tags:['NOT NULL'],nullPct:'0%',distinct:'5,968',desc:'Selling price in BRL (does not include freight).'},
      {name:'freight_value',type:'NUMERIC(10,2)',tags:['NOT NULL'],nullPct:'0%',distinct:'6,999',desc:'Shipping cost in BRL charged to the customer.'},
    ]},
  payments: { rows:103886, cols:5, pk:null, fks:['order_id → orders'], color:'#f39c12', summary:'Stores all payment transactions. An order can have multiple payment records (partial credit card + voucher).',
    columns:[
      {name:'order_id',type:'VARCHAR(32)',tags:['FK','NOT NULL'],nullPct:'0%',distinct:'99,440',desc:'References orders.order_id. Multiple payments per order are valid.'},
      {name:'payment_sequential',type:'INT',tags:['NOT NULL'],nullPct:'0%',distinct:'29',desc:'Sequence number for multi-payment orders.'},
      {name:'payment_type',type:'VARCHAR(16)',tags:['NOT NULL'],nullPct:'0%',distinct:'5',desc:'Payment method: credit_card, boleto, voucher, debit_card.'},
      {name:'payment_installments',type:'INT',tags:['NOT NULL'],nullPct:'0%',distinct:'24',desc:'Number of credit card instalments chosen by customer.'},
      {name:'payment_value',type:'NUMERIC(10,2)',tags:['NOT NULL'],nullPct:'0%',distinct:'6,496',desc:'Amount paid in this transaction in BRL.'},
    ]},
  products: { rows:32951, cols:9, pk:'product_id', fks:[], color:'#27ae60', summary:'Product catalogue with physical attributes. Names are hashed for anonymisation. Dimension data is critical for freight cost modelling.',
    columns:[
      {name:'product_id',type:'VARCHAR(32)',tags:['PK','NOT NULL'],nullPct:'0%',distinct:'32,951',desc:'Unique hashed product identifier.'},
      {name:'product_category_name',type:'VARCHAR(64)',tags:['NULLABLE'],nullPct:'0.3%',distinct:'73',desc:'Product category in Portuguese.'},
      {name:'product_name_lenght',type:'INT',tags:['NULLABLE'],nullPct:'0.3%',distinct:'66',desc:'Character count of the product name. Note: typo in column name.'},
      {name:'product_description_lenght',type:'INT',tags:['NULLABLE'],nullPct:'0.3%',distinct:'2,934',desc:'Character count of product description text.'},
      {name:'product_photos_qty',type:'INT',tags:['NULLABLE'],nullPct:'0.3%',distinct:'20',desc:'Number of product listing photos.'},
      {name:'product_weight_g',type:'INT',tags:['NULLABLE'],nullPct:'0.3%',distinct:'2,204',desc:'Product weight in grams.'},
      {name:'product_length_cm',type:'INT',tags:['NULLABLE'],nullPct:'0.3%',distinct:'98',desc:'Product length in centimetres.'},
      {name:'product_height_cm',type:'INT',tags:['NULLABLE'],nullPct:'0.3%',distinct:'105',desc:'Product height in centimetres.'},
      {name:'product_width_cm',type:'INT',tags:['NULLABLE'],nullPct:'0.3%',distinct:'95',desc:'Product width in centimetres.'},
    ]},
  sellers: { rows:3095, cols:4, pk:'seller_id', fks:[], color:'#e74c3c', summary:'Marketplace vendor registry with geolocation data. Sellers are concentrated in São Paulo (SP).',
    columns:[
      {name:'seller_id',type:'VARCHAR(32)',tags:['PK','NOT NULL'],nullPct:'0%',distinct:'3,095',desc:'Unique hashed seller identifier.'},
      {name:'seller_zip_code_prefix',type:'INT',tags:['NOT NULL'],nullPct:'0%',distinct:'2,246',desc:'Seller postal code prefix.'},
      {name:'seller_city',type:'VARCHAR(64)',tags:['NOT NULL'],nullPct:'0%',distinct:'611',desc:'Seller city name.'},
      {name:'seller_state',type:'CHAR(2)',tags:['NOT NULL'],nullPct:'0%',distinct:'23',desc:'Seller state abbreviation.'},
    ]},
  reviews: { rows:99224, cols:7, pk:'review_id', fks:['order_id → orders'], color:'#8e44ad', summary:'Customer reviews attached to orders. 58.5% of comment_message and 87.3% of comment_title fields are null — customers rarely fill text feedback.',
    columns:[
      {name:'review_id',type:'VARCHAR(32)',tags:['PK','NOT NULL'],nullPct:'0%',distinct:'98,371',desc:'Unique review identifier.'},
      {name:'order_id',type:'VARCHAR(32)',tags:['FK','NOT NULL'],nullPct:'0%',distinct:'98,673',desc:'Order being reviewed.'},
      {name:'review_score',type:'INT',tags:['NOT NULL'],nullPct:'0%',distinct:'5',desc:'1–5 star rating.'},
      {name:'review_comment_title',type:'VARCHAR(64)',tags:['NULLABLE'],nullPct:'87.3%',distinct:'3,804',desc:'Optional review title. High null rate — customers rarely fill.'},
      {name:'review_comment_message',type:'TEXT',tags:['NULLABLE'],nullPct:'58.5%',distinct:'39,521',desc:'Optional review body text.'},
      {name:'review_creation_date',type:'TIMESTAMP',tags:['NOT NULL'],nullPct:'0%',distinct:'1,610',desc:'When survey was sent to customer.'},
      {name:'review_answer_timestamp',type:'TIMESTAMP',tags:['NOT NULL'],nullPct:'0%',distinct:'82,083',desc:'When customer responded.'},
    ]},
  geolocation: { rows:1000163, cols:5, pk:null, fks:[], color:'#666680', summary:'Mapping table linking zip code prefixes to lat/lon coordinates. Contains >1M rows. Known issue: inconsistent city name casing.',
    columns:[
      {name:'geolocation_zip_code_prefix',type:'INT',tags:['NOT NULL'],nullPct:'0%',distinct:'19,015',desc:'Postal code prefix — join key.'},
      {name:'geolocation_lat',type:'FLOAT',tags:['NOT NULL'],nullPct:'0%',distinct:'717,378',desc:'Latitude coordinate.'},
      {name:'geolocation_lng',type:'FLOAT',tags:['NOT NULL'],nullPct:'0%',distinct:'717,378',desc:'Longitude coordinate.'},
      {name:'geolocation_city',type:'VARCHAR(64)',tags:['NOT NULL'],nullPct:'0%',distinct:'8,011',desc:'City name — mixed casing, needs normalisation.'},
      {name:'geolocation_state',type:'CHAR(2)',tags:['NOT NULL'],nullPct:'0%',distinct:'27',desc:'State abbreviation.'},
    ]},
}

const TV = { PK:'pk', FK:'fk', IDX:'idx', 'NOT NULL':'nn', NULLABLE:'warn' }

function ColCard({ col }) {
  const nullPct = parseFloat(col.nullPct)
  const nullColor = nullPct > 50 ? '#e74c3c' : nullPct > 0 ? '#f39c12' : '#27ae60'
  return (
    <div style={{ background:'#16161f', border:'1px solid #1e1e2e', borderRadius:10, padding:'16px', transition:'border-color 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(192,57,43,0.5)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='#1e1e2e'}
    >
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:8 }}>
        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:12, fontWeight:700, color:'#f0828a' }}>{col.name}</span>
        {col.tags.map(t => <Tag key={t} variant={TV[t]||'default'}>{t}</Tag>)}
      </div>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'#3498db', marginBottom:8 }}>{col.type}</div>
      <p style={{ fontSize:12, color:'#666680', lineHeight:1.6, marginBottom:12 }}>{col.desc}</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div style={{ background:'#111118', borderRadius:7, padding:'8px 12px' }}>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#444458', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Null %</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:13, color:nullColor }}>{col.nullPct}</div>
        </div>
        <div style={{ background:'#111118', borderRadius:7, padding:'8px 12px' }}>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#444458', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Distinct</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:13, color:'#b0b0c8' }}>{col.distinct}</div>
        </div>
      </div>
    </div>
  )
}

export default function SchemaPage() {
  const [activeTable, setActiveTable] = useState('customers')
  const [filter, setFilter] = useState('')
  const t = TABLES_DATA[activeTable]
  const filteredCols = t.columns.filter(c => !filter || c.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:'#e8e8f0', margin:0 }}>Schema Explorer</h1>
        <p style={{ fontSize:14, color:'#666680', marginTop:6 }}>Browse all {Object.keys(TABLES_DATA).length} tables · 47 columns · Live from Olist DB</p>
      </div>

      <div style={{ display:'flex', gap:16 }}>
        {/* Left: table list */}
        <div style={{ width:250, flexShrink:0 }}>
          <Panel>
            <PanelHeader title={`Tables (${Object.keys(TABLES_DATA).length})`}/>
            <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:6, maxHeight:'72vh', overflowY:'auto' }}>
              {Object.entries(TABLES_DATA).map(([name, info]) => (
                <button key={name} onClick={()=>setActiveTable(name)} style={{
                  background: activeTable===name ? 'rgba(192,57,43,0.08)' : '#16161f',
                  border: `1px solid ${activeTable===name?'#c0392b':'#1e1e2e'}`,
                  borderLeft: `3px solid ${activeTable===name?'#c0392b':'transparent'}`,
                  borderRadius:10, padding:'13px 14px', cursor:'pointer',
                  textAlign:'left', transition:'all 0.15s', width:'100%',
                }}
                  onMouseEnter={e=>{ if(activeTable!==name){e.currentTarget.style.borderLeftColor='rgba(192,57,43,0.5)';e.currentTarget.style.background='rgba(255,255,255,0.02)'} }}
                  onMouseLeave={e=>{ if(activeTable!==name){e.currentTarget.style.borderLeftColor='transparent';e.currentTarget.style.background='#16161f'} }}
                >
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontFamily:"'Space Mono',monospace", fontSize:12, fontWeight:700, color:'#f0828a' }}>{name}</span>
                    <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#666680' }}>{info.cols}c</span>
                  </div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'#444458', marginBottom:8 }}>{info.rows.toLocaleString()} rows</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {info.pk && <Tag variant="pk">PK</Tag>}
                    {info.fks.slice(0,2).map((_,i) => <Tag key={i} variant="fk">FK</Tag>)}
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right: detail */}
        <div style={{ flex:1, minWidth:0 }}>
          {/* Info boxes */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {[
              {label:'Columns',value:t.cols},
              {label:'Rows',value:t.rows.toLocaleString()},
              {label:'FK Links',value:t.fks.length},
              {label:'Primary Key',value:t.pk||'—',small:true},
            ].map(b => (
              <div key={b.label} style={{ background:'#111118', border:'1px solid #1e1e2e', borderRadius:12, padding:'16px' }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:'#666680', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{b.label}</div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, color:'#e8e8f0', fontSize:b.small?14:22 }}>{b.value}</div>
              </div>
            ))}
          </div>

          {/* Columns */}
          <Panel style={{ marginBottom:14 }}>
            <PanelHeader title={`${activeTable} — Columns`} subtitle={`${t.cols} columns`}>
              <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter columns…"
                style={{ background:'#16161f', border:'1px solid #1e1e2e', borderRadius:8, padding:'8px 14px', fontSize:12, color:'#e8e8f0', outline:'none', fontFamily:"'Space Mono',monospace", width:160, transition:'border-color 0.2s' }}
                onFocus={e=>e.target.style.borderColor='#c0392b'} onBlur={e=>e.target.style.borderColor='#1e1e2e'}
              />
              <Button variant="ghost">⬇ DDL</Button>
            </PanelHeader>
            <PanelBody>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {filteredCols.map(col => <ColCard key={col.name} col={col}/>)}
              </div>
            </PanelBody>
          </Panel>

          {/* AI summary */}
          <Panel>
            <PanelHeader title="🧠 AI Business Summary"><Tag variant="done">AI Generated</Tag></PanelHeader>
            <PanelBody>
              <p style={{ fontSize:14, color:'#b0b0c8', lineHeight:1.8 }}>{t.summary}</p>
              {t.fks.length > 0 && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:14 }}>
                  {t.fks.map((fk,i) => <Tag key={i} variant="fk">🔗 {fk}</Tag>)}
                </div>
              )}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  )
}