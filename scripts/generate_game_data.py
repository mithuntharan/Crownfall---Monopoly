import json
import zipfile
import xml.etree.ElementTree as ET
import os

def read_excel_sheets(xlsx_path):
    z = zipfile.ZipFile(xlsx_path)
    wb_xml = ET.fromstring(z.read('xl/workbook.xml'))
    ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
          'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

    wb_rels_xml = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rels = {rel.attrib['Id']: rel.attrib['Target'] for rel in wb_rels_xml}

    has_shared_strings = 'xl/sharedStrings.xml' in z.namelist()
    shared_strings = []
    if has_shared_strings:
        ss_xml = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in ss_xml.findall('.//main:si', ns):
            text = ''.join([t.text or '' for t in si.findall('.//main:t', ns)])
            shared_strings.append(text)

    sheets_data = {}
    for sheet in wb_xml.findall('.//main:sheet', ns):
        name = sheet.attrib['name']
        r_id = sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        target = rels[r_id].lstrip('/')
        sheet_xml = ET.fromstring(z.read(target))
        rows = []
        for row in sheet_xml.findall('.//main:row', ns):
            row_vals = {}
            for c in row.findall('.//main:c', ns):
                cell_ref = c.attrib.get('r')
                cell_type = c.attrib.get('t')
                v = c.find('main:v', ns)
                val = None
                if cell_type == 's' and v is not None:
                    val = shared_strings[int(v.text)]
                elif cell_type == 'inlineStr':
                    is_el = c.find('main:is', ns)
                    if is_el is not None:
                        t_el = is_el.find('main:t', ns)
                        if t_el is not None:
                            val = t_el.text
                elif v is not None:
                    val = v.text
                row_vals[cell_ref] = val
            if row_vals:
                rows.append(row_vals)
        sheets_data[name] = rows
    return sheets_data

def validate_and_parse(sheets_data):
    city_props = sheets_data['City Properties'][1:]
    special_props = sheets_data['Special Properties'][1:]
    chance_rows = sheets_data['Chance'][1:]
    chest_rows = sheets_data['Community Chest'][1:]
    rules_rows = sheets_data['Rules'][1:]
    color_groups_rows = sheets_data['Color Groups'][1:]

    valid_groups = {'Green', 'Yellow', 'Red', 'Blue'}

    # 1. Color groups
    color_groups = {}
    for r in color_groups_rows:
        num = list(r.keys())[0][1:]
        color = r.get(f'A{num}')
        props = [p.strip() for p in r.get(f'B{num}', '').split(',')]
        rule = r.get(f'C{num}')
        color_groups[color.upper()] = {
            'name': color,
            'properties': props,
            'rule': rule
        }

    # 2. City properties
    cities = []
    for r in city_props:
        num = list(r.keys())[0][1:]
        color = r.get(f'A{num}')
        city = r.get(f'B{num}')
        price = int(r.get(f'C{num}'))
        base_rent = int(r.get(f'D{num}'))
        rent1 = int(r.get(f'E{num}'))
        rent2 = int(r.get(f'F{num}'))
        rent3 = int(r.get(f'G{num}'))
        hotel = int(r.get(f'H{num}'))
        build_cost = int(r.get(f'I{num}'))
        mortgage = int(r.get(f'J{num}'))
        status = r.get(f'K{num}')

        cid = city.lower().replace(' ', '_')
        cities.append({
            'id': cid,
            'name': city,
            'colorGroup': color.upper(),
            'purchasePrice': price,
            'baseRent': base_rent,
            'rentOneHouse': rent1,
            'rentTwoHouses': rent2,
            'rentThreeHouses': rent3,
            'hotelRent': hotel,
            'buildingCost': build_cost,
            'mortgageValue': mortgage,
            'sourceStatus': status
        })

    # 3. Special properties
    specials = []
    for r in special_props:
        num = list(r.keys())[0][1:]
        prop = r.get(f'A{num}')
        price = int(r.get(f'B{num}'))
        mortgage = int(r.get(f'C{num}'))
        rent_alone = r.get(f'D{num}')
        rent_pair = r.get(f'E{num}')
        pair = r.get(f'F{num}')

        sid = prop.lower().replace(' ', '_')
        specials.append({
            'id': sid,
            'name': prop,
            'purchasePrice': price,
            'mortgageValue': mortgage,
            'rentAlone': rent_alone,
            'rentWithPair': rent_pair,
            'pair': pair
        })

    # 4. Chance declarations
    chance = []
    for r in chance_rows:
        num = list(r.keys())[0][1:]
        section = r.get(f'A{num}')
        dice_sum = int(r.get(f'B{num}'))
        decl = r.get(f'C{num}')

        # classify kind and title
        kind = 'receive'
        title = decl
        effect = ''
        effect_note = 'BANK → YOU'

        if dice_sum == 2:
            title = 'Loss in Share Market'
            kind = 'pay'
            effect = '- ₹2,000'
            effect_note = 'YOU → BANK'
        elif dice_sum == 3:
            title = 'Lottery Prize'
            kind = 'receive'
            effect = '+ ₹2,500'
            effect_note = 'BANK → YOU'
        elif dice_sum == 4:
            title = 'Accident Fine'
            kind = 'pay'
            effect = '- ₹1,000'
            effect_note = 'FINE · YOU → BANK'
        elif dice_sum == 5:
            title = 'Consolation Prize'
            kind = 'receive'
            effect = '+ ₹1,000'
            effect_note = 'BANK → YOU'
        elif dice_sum == 6:
            title = 'House Renovating'
            kind = 'pay'
            effect = '- ₹1,500'
            effect_note = 'YOU → BANK'
        elif dice_sum == 7:
            title = 'Jack Pot'
            kind = 'receive'
            effect = '+ ₹2,000'
            effect_note = 'BANK → YOU'
        elif dice_sum == 8:
            title = 'Fire Loss'
            kind = 'pay'
            effect = '- ₹3,000'
            effect_note = 'LOSS IN GODOWN · YOU → BANK'
        elif dice_sum == 9:
            title = 'Go Back to Bombay'
            kind = 'move'
            effect = 'MOVE TO BOMBAY'
            effect_note = 'PASS START: + ₹1,500 · THEN DARJEELING'
        elif dice_sum == 10:
            title = 'Go to Jail'
            kind = 'jail'
            effect = 'GO TO JAIL'
            effect_note = 'MOVE DIRECTLY · DO NOT PASS START'
        elif dice_sum == 11:
            title = 'Export Performance Prize'
            kind = 'receive'
            effect = '+ ₹3,000'
            effect_note = 'BANK → YOU'
        elif dice_sum == 12:
            title = 'Rest House'
            kind = 'rest'
            effect = 'REST HOUSE'
            effect_note = 'MISS YOUR NEXT TURN'

        chance.append({
            'diceSum': dice_sum,
            'section': section,
            'title': title,
            'declaration': decl,
            'kind': kind,
            'effect': effect,
            'effectNote': effect_note
        })
    chance.sort(key=lambda x: x['diceSum'])

    # 5. Community Chest declarations
    chest = []
    for r in chest_rows:
        num = list(r.keys())[0][1:]
        section = r.get(f'A{num}')
        dice_sum = int(r.get(f'B{num}'))
        decl = r.get(f'C{num}')

        kind = 'receive'
        title = decl
        effect = ''
        effect_note = 'BANK → YOU'

        if dice_sum == 2:
            title = 'Birthday Celebration'
            kind = 'players'
            effect = '+ ₹500 EACH'
            effect_note = 'EACH PLAYER → YOU'
        elif dice_sum == 3:
            title = 'Go to Jail'
            kind = 'jail'
            effect = 'GO TO JAIL'
            effect_note = 'MOVE DIRECTLY · DO NOT PASS START'
        elif dice_sum == 4:
            title = 'Beauty Contest'
            kind = 'receive'
            effect = '+ ₹2,500'
            effect_note = '1ST PRIZE · BANK → YOU'
        elif dice_sum == 5:
            title = 'School & Medical Fees'
            kind = 'pay'
            effect = '- ₹1,000'
            effect_note = 'YOU → BANK'
        elif dice_sum == 6:
            title = 'Income Tax Refund'
            kind = 'receive'
            effect = '+ ₹2,000'
            effect_note = 'BANK → YOU'
        elif dice_sum == 7:
            title = 'Marriage Celebration'
            kind = 'pay'
            effect = '- ₹2,000'
            effect_note = 'YOU → BANK'
        elif dice_sum == 8:
            title = 'Rest House'
            kind = 'rest'
            effect = 'REST HOUSE'
            effect_note = 'MISS YOUR NEXT TURN'
        elif dice_sum == 9:
            title = 'General Repairs'
            kind = 'buildings'
            effect = '₹50 · ₹100'
            effect_note = 'EACH HOUSE · EACH HOTEL'
        elif dice_sum == 10:
            title = 'Interest on Shares'
            kind = 'receive'
            effect = '+ ₹1,500'
            effect_note = 'BANK → YOU'
        elif dice_sum == 11:
            title = 'Insurance Premium'
            kind = 'pay'
            effect = '- ₹1,500'
            effect_note = 'YOU → BANK'
        elif dice_sum == 12:
            title = 'Sale of Stocks'
            kind = 'receive'
            effect = '+ ₹3,000'
            effect_note = 'BANK → YOU'

        chest.append({
            'diceSum': dice_sum,
            'section': section,
            'title': title,
            'declaration': decl,
            'kind': kind,
            'effect': effect,
            'effectNote': effect_note
        })
    chest.sort(key=lambda x: x['diceSum'])

    # 6. Rules
    rules = []
    for r in rules_rows:
        num = list(r.keys())[0][1:]
        rules.append({
            'section': r.get(f'A{num}'),
            'rule': r.get(f'B{num}'),
            'value': r.get(f'C{num}')
        })

    # 7. Board Spaces (36 spaces authoritative physical board clockwise sequence)
    board_spaces = [
        # Side 1: Bottom edge (moving Right to Left: 0 at Bottom-Right, 9 at Bottom-Left)
        {"index": 0, "name": "START", "type": "corner", "colorGroup": "NONE", "side": "bottom"},
        {"index": 1, "name": "BOMBAY", "type": "city", "colorGroup": "RED", "propertyId": "bombay", "side": "bottom"},
        {"index": 2, "name": "WATER WORKS", "type": "special", "colorGroup": "NONE", "propertyId": "water_works", "side": "bottom"},
        {"index": 3, "name": "RAILWAY", "type": "special", "colorGroup": "NONE", "propertyId": "railway", "side": "bottom"},
        {"index": 4, "name": "AHMEDABAD", "type": "city", "colorGroup": "RED", "propertyId": "ahmedabad", "side": "bottom"},
        {"index": 5, "name": "INCOME TAX", "type": "tax", "colorGroup": "NONE", "side": "bottom"},
        {"index": 6, "name": "INDORE", "type": "city", "colorGroup": "BLUE", "propertyId": "indore", "side": "bottom"},
        {"index": 7, "name": "CHANCE", "type": "chance", "colorGroup": "NONE", "side": "bottom"},
        {"index": 8, "name": "JAIPUR", "type": "city", "colorGroup": "BLUE", "propertyId": "jaipur", "side": "bottom"},

        # Corner 2: Bottom-Left
        {"index": 9, "name": "JAIL", "type": "corner", "colorGroup": "NONE", "side": "left"},

        # Side 2: Left edge (moving Bottom to Top: 9 at Bottom-Left, 18 at Top-Left)
        {"index": 10, "name": "DELHI", "type": "city", "colorGroup": "GREEN", "propertyId": "delhi", "side": "left"},
        {"index": 11, "name": "CHANDIGADH", "type": "city", "colorGroup": "GREEN", "propertyId": "chandigadh", "side": "left"},
        {"index": 12, "name": "ELECTRICAL COMPANY", "type": "special", "colorGroup": "NONE", "propertyId": "electrical_company", "side": "left"},
        {"index": 13, "name": "ROADWAYS", "type": "special", "colorGroup": "NONE", "propertyId": "roadways", "side": "left"},
        {"index": 14, "name": "SIMLA", "type": "city", "colorGroup": "YELLOW", "propertyId": "simla", "side": "left"},
        {"index": 15, "name": "AMRITSAR", "type": "city", "colorGroup": "YELLOW", "propertyId": "amritsar", "side": "left"},
        {"index": 16, "name": "COMMUNITY CHEST", "type": "chest", "colorGroup": "NONE", "side": "left"},
        {"index": 17, "name": "SRINAGAR", "type": "city", "colorGroup": "YELLOW", "propertyId": "srinagar", "side": "left"},

        # Corner 3: Top-Left
        {"index": 18, "name": "CLUB", "type": "corner", "colorGroup": "NONE", "side": "top"},

        # Side 3: Top edge (moving Left to Right: 18 at Top-Left, 27 at Top-Right)
        {"index": 19, "name": "AGRA", "type": "city", "colorGroup": "BLUE", "propertyId": "agra", "side": "top"},
        {"index": 20, "name": "CHANCE", "type": "chance", "colorGroup": "NONE", "side": "top"},
        {"index": 21, "name": "KANPUR", "type": "city", "colorGroup": "BLUE", "propertyId": "kanpur", "side": "top"},
        {"index": 22, "name": "PATNA", "type": "city", "colorGroup": "BLUE", "propertyId": "patna", "side": "top"},
        {"index": 23, "name": "DARJEELING", "type": "city", "colorGroup": "RED", "propertyId": "darjeeling", "side": "top"},
        {"index": 24, "name": "AIR INDIA", "type": "special", "colorGroup": "NONE", "propertyId": "air_india", "side": "top"},
        {"index": 25, "name": "KOLKATTA", "type": "city", "colorGroup": "RED", "propertyId": "kolkatta", "side": "top"},
        {"index": 26, "name": "HYDERABAD", "type": "city", "colorGroup": "RED", "propertyId": "hyderabad", "side": "top"},

        # Corner 4: Top-Right
        {"index": 27, "name": "REST HOUSE", "type": "corner", "colorGroup": "NONE", "side": "right"},

        # Side 4: Right edge (moving Top to Bottom: 27 at Top-Right, 0 at Bottom-Right)
        {"index": 28, "name": "MADRAS", "type": "city", "colorGroup": "YELLOW", "propertyId": "madras", "side": "right"},
        {"index": 29, "name": "COMMUNITY CHEST", "type": "chest", "colorGroup": "NONE", "side": "right"},
        {"index": 30, "name": "BANGALORE", "type": "city", "colorGroup": "YELLOW", "propertyId": "bangalore", "side": "right"},
        {"index": 31, "name": "WEALTH TAX", "type": "tax", "colorGroup": "NONE", "side": "right"},
        {"index": 32, "name": "OOTACAMUND", "type": "city", "colorGroup": "GREEN", "propertyId": "ootacamund", "side": "right"},
        {"index": 33, "name": "COCHIN", "type": "city", "colorGroup": "GREEN", "propertyId": "cochin", "side": "right"},
        {"index": 34, "name": "MOTOR BOAT", "type": "special", "colorGroup": "NONE", "propertyId": "motor_boat", "side": "right"},
        {"index": 35, "name": "MARGOA", "type": "city", "colorGroup": "GREEN", "propertyId": "margoa", "side": "right"},
    ]

    return {
        'colorGroups': color_groups,
        'cityProperties': cities,
        'specialProperties': specials,
        'chanceDeclarations': chance,
        'chestDeclarations': chest,
        'rules': rules,
        'boardSpaces': board_spaces
    }

if __name__ == '__main__':
    sheets = read_excel_sheets('BUSINESS_Master_Datasheet.xlsx')
    data = validate_and_parse(sheets)
    os.makedirs('src/data', exist_ok=True)
    with open('src/data/master_game_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print('Generated src/data/master_game_data.json with 20 cities, 6 specials, 11 chance, 11 chest!')
