// ⚠️ LEGACY — DO NOT RUN. This applied the ORIGINAL machine-seeded taxonomy
// (including the since-removed `letters` collection). public/glifs.json now
// holds the maintainer-curated taxonomy; running this would clobber it and
// fail scripts/validate-glifs.mjs. Kept for historical reference only.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// id -> primary category
const PRIMARY = {
  1:"faces",2:"faces",3:"faces",4:"symbols",5:"faces",6:"faces",7:"animals",8:"faces",9:"faces",10:"faces",
  11:"circles",12:"nature",13:"nature",14:"circles",15:"faces",16:"figures",17:"figures",18:"faces",19:"symbols",20:"figures",
  21:"faces",22:"faces",23:"figures",24:"figures",25:"animals",26:"figures",27:"nature",28:"hands",29:"figures",30:"symbols",
  31:"faces",32:"nature",33:"items",34:"faces",35:"items",36:"faces",37:"circles",38:"circles",39:"symbols",40:"nature",
  41:"faces",42:"symbols",43:"faces",44:"symbols",45:"figures",46:"circles",47:"faces",48:"faces",49:"hands",50:"faces",
  51:"faces",52:"animals",53:"animals",54:"figures",55:"animals",56:"symbols",57:"hands",58:"hands",59:"circles",60:"animals",
  61:"items",62:"circles",63:"hands",64:"circles",65:"animals",66:"faces",67:"items",68:"animals",69:"nature",70:"symbols",
  71:"faces",72:"circles",73:"items",74:"items",75:"items",76:"symbols",77:"circles",78:"figures",79:"faces",80:"symbols",
  81:"figures",82:"circles",83:"nature",84:"faces",85:"items",86:"hands",87:"items",88:"items",89:"nature",90:"faces",
  91:"hands",92:"symbols",93:"items",94:"faces",95:"items",96:"symbols",97:"nature",98:"symbols",99:"faces",100:"nature",
  101:"symbols",102:"nature",103:"faces",104:"items",105:"faces",106:"items",107:"hands",108:"items",109:"animals",110:"animals",
  111:"circles",112:"symbols",113:"symbols",114:"symbols",115:"hands",116:"faces",117:"symbols",118:"symbols",119:"figures",120:"items",
  121:"faces",122:"faces",123:"symbols",124:"items",125:"circles",126:"faces",127:"hands",128:"items",129:"items",130:"items",
  131:"animals",132:"hands",133:"figures",134:"items",135:"faces",136:"symbols",137:"faces",138:"circles",139:"faces",140:"symbols",
  141:"circles",142:"nature",143:"animals",144:"symbols",145:"figures",146:"faces",147:"symbols",148:"symbols",149:"symbols",150:"symbols",
  151:"symbols",152:"figures",153:"symbols",154:"animals",155:"circles",156:"nature",157:"symbols",158:"symbols",159:"letters",160:"symbols",
  161:"symbols",162:"faces",163:"items",164:"faces",165:"faces",166:"animals",167:"symbols",168:"animals",169:"figures",170:"nature",
  171:"items",172:"symbols",173:"symbols",174:"animals",175:"faces",176:"nature",177:"symbols",178:"animals",179:"figures",180:"symbols",
  181:"letters",182:"hands",183:"animals",184:"faces",185:"faces",186:"animals",187:"faces",188:"circles",189:"circles",190:"items",
  191:"figures",192:"symbols",193:"symbols",194:"symbols",195:"circles",196:"circles",197:"circles",198:"symbols",199:"circles",200:"symbols",
  201:"symbols",202:"symbols",203:"items",204:"symbols",205:"animals",206:"animals",207:"animals",208:"symbols",209:"symbols",210:"faces",
  211:"faces",212:"symbols",213:"faces",214:"circles",215:"circles",216:"circles",217:"symbols",218:"symbols",219:"symbols",220:"faces",
  221:"faces",222:"figures",223:"symbols",224:"circles",225:"faces",226:"letters",227:"circles",228:"symbols",229:"circles",230:"nature",
  231:"animals",232:"symbols",233:"figures",234:"symbols",235:"figures",236:"animals",237:"items",238:"symbols",239:"symbols",240:"symbols",
  241:"figures",242:"symbols",243:"faces",244:"circles",245:"figures",246:"symbols",247:"figures",248:"symbols",249:"symbols",250:"animals",
  251:"letters",252:"figures",253:"animals",254:"figures",255:"faces",256:"symbols",257:"symbols",258:"faces",259:"symbols",260:"symbols",
  261:"items",262:"faces",263:"figures",264:"circles",265:"circles",266:"animals",267:"faces",268:"figures",269:"animals",270:"symbols",
  271:"symbols",272:"faces",273:"faces",274:"circles",275:"symbols",276:"faces",277:"figures",278:"symbols",279:"circles",280:"letters",
  281:"symbols",282:"symbols",283:"faces",284:"figures",285:"symbols",286:"letters",287:"faces",288:"faces",289:"symbols",290:"items",
  291:"animals",292:"faces",293:"animals",294:"circles",295:"hands",296:"symbols",297:"symbols",298:"faces",299:"figures",300:"animals",
};

const path = join(root, "public", "glifs.json");
const glifs = JSON.parse(readFileSync(path, "utf8"));

let missing = 0;
for (const g of glifs) {
  const cat = PRIMARY[g.id];
  if (!cat) missing++;
  g.categories = cat ? [cat] : [];
  delete g.category; // superseded by categories[]
}

writeFileSync(path, JSON.stringify(glifs, null, 2) + "\n");

const counts = {};
for (const g of glifs) for (const c of g.categories) counts[c] = (counts[c] || 0) + 1;
console.log("applied. missing:", missing);
console.log("counts:", counts);
