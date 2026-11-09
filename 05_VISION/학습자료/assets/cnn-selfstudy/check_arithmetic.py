"""Run with Python 3; no third-party packages needed."""
def size(n, k, s=1, p=0, d=1):
    return (n + 2*p - d*(k-1) - 1)//s + 1

x = [[1,2,3],[4,5,6],[7,8,9]]
w = [[1,0,-1],[1,0,-1],[1,0,-1]]
y = sum(x[i][j]*w[i][j] for i in range(3) for j in range(3))
assert y == -6
assert size(32,3,2,1) == 16
assert 16*3*3*3+16 == 448
assert 3*3*3*8 == 216
assert 3*3*3+3*8 == 51
r,j = 1,1
for k,s in [(3,1),(2,2),(3,1)]:
    r,j = r+(k-1)*j, j*s
assert (r,j) == (8,2)
print("filter",y,"conv output",size(32,3,2,1),"RF",r,"jump",j)
for n in (224,32,225):
    conv=size(n,7,2,3)
    pool=size(conv,3,2,1)
    shapes=[conv,pool]
    for _ in range(3):
        shapes.append(size(shapes[-1],3,2,1))
    print("input",n,"stem conv/pool, stages2-4",shapes)
    assert shapes == {224:[112,56,28,14,7],32:[16,8,4,2,1],225:[113,57,29,15,8]}[n]
# Count Conv weights, BN affine parameters (2 per channel), and FC.
params=3*64*7*7+2*64
cin=64
for cout,stride in [(64,1),(128,2),(256,2),(512,2)]:
    params += cin*cout*9 + cout*cout*9 + 4*cout
    if stride != 1 or cin != cout:
        params += cin*cout + 2*cout
    params += 2*cout*cout*9 + 4*cout
    cin=cout
params += 512*10+10
assert params == 11_181_642
print("ResNet18, classes=10 parameters",params)
print("all arithmetic checks passed")
