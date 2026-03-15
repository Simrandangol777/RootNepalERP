def get_season(month):
    if month in [3, 4, 5]:
        return "Spring"
    elif month in [9, 10, 11]:
        return "Autumn"
    elif month in [12, 1, 2]:
        return "Winter"
    return "Monsoon"