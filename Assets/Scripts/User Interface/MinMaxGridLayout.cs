using UnityEngine;
using UnityEngine.UI;

[AddComponentMenu("Layout/Min Max Grid Layout")]
public class MinMaxGridLayout : LayoutGroup
{
    [Min(0f)]
    public float minCellWidth = 120f;
    [Min(0f)]
    public float maxCellWidth = 240f;
    [Min(0f)]
    public float cellHeight = 120f;
    public Vector2 spacing = Vector2.zero;
    [SerializeField] private bool useChildHeight = true;
    [SerializeField] private bool useParentWidth = true;
    [SerializeField] private RectTransform widthSource;

    private int columns = 1;
    private int rows = 1;
    private float cellWidth;
    private float usedWidth;
    private float usedHeight;
    private float[] rowHeights = new float[0];
    private float[] rowOffsets = new float[0];

    public override void CalculateLayoutInputHorizontal()
    {
        base.CalculateLayoutInputHorizontal();
        CalculateGrid();
        float minWidth = Mathf.Max(0f, minCellWidth);
        SetLayoutInputForAxis(minWidth + padding.horizontal, usedWidth + padding.horizontal, 1, 0);
    }

    public override void CalculateLayoutInputVertical()
    {
        CalculateGrid();
        SetLayoutInputForAxis(usedHeight + padding.vertical, usedHeight + padding.vertical, -1, 1);
    }

    public override void SetLayoutHorizontal()
    {
        SetCellsAlongAxis(0);
    }

    public override void SetLayoutVertical()
    {
        SetCellsAlongAxis(1);
    }

    private void CalculateGrid()
    {
        int childCount = rectChildren.Count;
        if (childCount == 0)
        {
            columns = 1;
            rows = 1;
            cellWidth = 0f;
            usedWidth = 0f;
            usedHeight = 0f;
            return;
        }

        float minWidth = Mathf.Max(0f, minCellWidth);
        float maxWidth = Mathf.Max(minWidth, maxCellWidth);
        float layoutWidth = GetLayoutWidth();
        float availableWidth = Mathf.Max(0f, layoutWidth - padding.left - padding.right);

        float spacingX = spacing.x;
        float spacingY = spacing.y;

        int columnsByMax = maxWidth > 0f
            ? Mathf.CeilToInt((availableWidth + spacingX) / (maxWidth + spacingX))
            : 1;
        int columnsByMin = minWidth > 0f
            ? Mathf.FloorToInt((availableWidth + spacingX) / (minWidth + spacingX))
            : childCount;

        columnsByMax = Mathf.Clamp(columnsByMax, 1, childCount);
        columnsByMin = Mathf.Clamp(columnsByMin, 1, childCount);

        columns = columnsByMax;
        if (columns > columnsByMin)
        {
            columns = columnsByMin;
        }

        float rawCellWidth = (availableWidth - spacingX * (columns - 1)) / columns;
        cellWidth = Mathf.Clamp(rawCellWidth, minWidth, maxWidth);

        rows = Mathf.CeilToInt(childCount / (float)columns);
        usedWidth = cellWidth * columns + spacingX * (columns - 1);

        if (useChildHeight)
        {
            EnsureRowArrays(rows);
            float rowOffset = 0f;

            for (int row = 0; row < rows; row++)
            {
                float rowHeight = 0f;
                int rowStart = row * columns;
                int rowEnd = Mathf.Min(rowStart + columns, childCount);

                for (int i = rowStart; i < rowEnd; i++)
                {
                    float childHeight = GetChildHeight(rectChildren[i]);
                    if (childHeight > rowHeight)
                    {
                        rowHeight = childHeight;
                    }
                }

                if (rowHeight <= 0f)
                {
                    rowHeight = cellHeight;
                }

                rowHeights[row] = rowHeight;
                rowOffsets[row] = rowOffset;
                rowOffset += rowHeight;
                if (row < rows - 1)
                {
                    rowOffset += spacingY;
                }
            }

            usedHeight = rowOffset;
        }
        else
        {
            usedHeight = cellHeight * rows + spacingY * (rows - 1);
        }
    }

    private void SetCellsAlongAxis(int axis)
    {
        CalculateGrid();
        int childCount = rectChildren.Count;
        if (childCount == 0)
        {
            return;
        }

        float layoutWidth = GetLayoutWidth();
        float startX = GetStartOffsetWithSize(0, usedWidth, layoutWidth);
        float startY = GetStartOffset(1, usedHeight);

        for (int i = 0; i < childCount; i++)
        {
            int row = i / columns;
            int column = i % columns;
            RectTransform item = rectChildren[i];

            if (axis == 0)
            {
                float xPos = startX + (cellWidth + spacing.x) * column;
                SetChildAlongAxis(item, 0, xPos, cellWidth);
            }
            else
            {
                float yPos = startY + (useChildHeight ? rowOffsets[row] : (cellHeight + spacing.y) * row);
                float height = useChildHeight ? GetChildHeight(item) : cellHeight;
                SetChildAlongAxis(item, 1, yPos, height);
            }
        }
    }

    private float GetLayoutWidth()
    {
        if (widthSource != null)
        {
            return widthSource.rect.width;
        }

        if (useParentWidth)
        {
            RectTransform parentRect = rectTransform.parent as RectTransform;
            if (parentRect != null)
            {
                return parentRect.rect.width;
            }
        }

        return rectTransform.rect.width;
    }

    private float GetStartOffsetWithSize(int axis, float requiredSpaceWithoutPadding, float axisSize)
    {
        float paddingTotal = axis == 0 ? padding.horizontal : padding.vertical;
        float sizeWithoutPadding = axisSize - paddingTotal;
        float alignmentOnAxis = GetAlignmentOnAxis(axis);
        return (axis == 0 ? padding.left : padding.top) + (sizeWithoutPadding - requiredSpaceWithoutPadding) * alignmentOnAxis;
    }

    private void EnsureRowArrays(int rowCount)
    {
        if (rowHeights.Length != rowCount)
        {
            rowHeights = new float[rowCount];
            rowOffsets = new float[rowCount];
        }
    }

    private float GetChildHeight(RectTransform child)
    {
        float preferred = LayoutUtility.GetPreferredHeight(child);
        if (preferred <= 0f)
        {
            preferred = LayoutUtility.GetMinHeight(child);
        }

        if (preferred <= 0f)
        {
            preferred = cellHeight;
        }

        return preferred;
    }
}
